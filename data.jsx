// ============================================================
// data.jsx — constants, IEC tolerance logic, persistence helpers
// Exposes everything on window for the other Babel scripts.
// ============================================================

const STORAGE_KEY = 'vega-ha-check-v1';

// ---- IR/RF measurement points (in courtroom order) ----
const IRRF_AREAS = [
  { id: 'judge',     name: "Judge's Desk",        defH: '1.2' },
  { id: 'courttaker',name: "Court Taker's Desk",  defH: '1.2' },
  { id: 'witness',   name: 'Witness Booth',        defH: '1.2' },
  { id: 'dock',      name: 'Dock',                 defH: '1.2' },
  { id: 'jury',      name: 'Jury',                 defH: '1.2' },
  { id: 'bar1',      name: 'Bar 1',                defH: '1.2' },
  { id: 'bar2',      name: 'Bar 2',                defH: '1.2' },
  { id: 'bar3',      name: 'Bar 3',                defH: '1.2' },
  { id: 'gallleft',  name: 'Public Gallery Left',  defH: '1.2' },
  { id: 'gallright', name: 'Public Gallery Right', defH: '1.2' },
];

const AUDIO_QUALITY = ['Excellent', 'Good', 'Fair', 'Poor'];
const NOISE_LEVELS  = ['Very Low', 'Low', 'Moderate', 'High'];

// tone mapping for segmented controls (good = green, bad = red)
const AUDIO_TONE = { Excellent: 'good', Good: 'good', Fair: 'warn', Poor: 'bad' };
const NOISE_TONE = { 'Very Low': 'good', Low: 'good', Moderate: 'warn', High: 'bad' };

// ---- Default record ----
function freshState() {
  return {
    meta: {
      courtroom: '', location: '', technician: '', jobRef: '',
      date: new Date().toISOString().slice(0, 10),
    },
    loop: {
      installed: null,            // true / false / null
      height: '',
      bgNoise: '',                // problem-zone notes
      areas22: '',                // areas > -22 dB
      areas32: '',                // areas > -32 dB
      fieldInitial: '', fieldFinal: '',
      frInit: { k5: '', k1: '', h100: '' },
      frFinal: { k5: '', k1: '', h100: '' },
      overspillRequired: null,    // true / false
      ampModel: '',
      signage: null,              // true / false
      photo: null,
      result: null,              // 'pass' / 'fail'
    },
    irrf: {
      areas: {},                  // id -> { na, naNote, height, audio, noise, photo }
      receiverModel: 'Sennheiser SET 830s', receiverQty: '',
      emitterModel: 'Sennheiser SI30, SZI30', emitterQty: '',
      signage: null,
    },
    closeout: {
      bwofPhoto: null,
      signagePhoto: null,
    },
    declaration: {
      result: null,              // 'pass' / 'fail'
      name: '', date: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  };
}

// ---- Persistence ----
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // shallow-merge over a fresh skeleton so new fields don't break old saves
    const base = freshState();
    return {
      meta: { ...base.meta, ...parsed.meta },
      loop: { ...base.loop, ...parsed.loop,
              frInit: { ...base.loop.frInit, ...(parsed.loop && parsed.loop.frInit) },
              frFinal: { ...base.loop.frFinal, ...(parsed.loop && parsed.loop.frFinal) } },
      irrf: { ...base.irrf, ...parsed.irrf, areas: (parsed.irrf && parsed.irrf.areas) || {} },
      closeout: { ...base.closeout, ...parsed.closeout },
      declaration: { ...base.declaration, ...parsed.declaration },
    };
  } catch (e) { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    // quota — drop photos and retry so at least the data resumes
    try {
      const lite = JSON.parse(JSON.stringify(state));
      lite.loop.photo = lite.loop.photo ? '__omitted__' : null;
      lite.closeout.bwofPhoto = lite.closeout.bwofPhoto ? '__omitted__' : null;
      lite.closeout.signagePhoto = lite.closeout.signagePhoto ? '__omitted__' : null;
      Object.keys(lite.irrf.areas).forEach(k => {
        if (lite.irrf.areas[k].photo) lite.irrf.areas[k].photo = '__omitted__';
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lite));
    } catch (e2) {/* give up */}
    return false;
  }
}

function clearState() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} }

// ---- Photo capture: downscale to keep storage sane ----
function downscaleImage(file, maxDim, quality) {
  maxDim = maxDim || 1100;
  quality = quality || 0.7;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================
// IEC 60118-4 tolerance evaluation (induction loop)
// Field strength: 1 kHz sine, target 0 dB ± 3 dB.
// Frequency response (relative to 1 kHz, pink noise):
//   5 kHz within ± 3 dB of 1 kHz, 100 Hz within ± 3 dB of 1 kHz.
// All evaluations are advisory — the engineer confirms.
// ============================================================
function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function evalField(value) {
  const v = num(value);
  if (v === null) return { state: 'empty' };
  const ok = v >= -3 && v <= 3;
  return { state: ok ? 'ok' : 'warn', value: v,
           msg: ok ? 'Within 0 ±3 dB' : `Out of range (${v > 0 ? '+' : ''}${v.toFixed(1)} dB)` };
}

function evalFreqResponse(fr) {
  const k1 = num(fr.k1), k5 = num(fr.k5), h100 = num(fr.h100);
  const out = { k5: { state: 'empty' }, h100: { state: 'empty' }, anyWarn: false, complete: false };
  if (k1 === null) return out;
  if (k5 !== null) {
    const d = k5 - k1;
    const ok = Math.abs(d) <= 3;
    out.k5 = { state: ok ? 'ok' : 'warn', delta: d,
               msg: ok ? '5 kHz within ±3 dB of 1 kHz' : `5 kHz Δ ${d > 0 ? '+' : ''}${d.toFixed(1)} dB` };
    if (!ok) out.anyWarn = true;
  }
  if (h100 !== null) {
    const d = h100 - k1;
    const ok = Math.abs(d) <= 3;
    out.h100 = { state: ok ? 'ok' : 'warn', delta: d,
                 msg: ok ? '100 Hz within ±3 dB of 1 kHz' : `100 Hz Δ ${d > 0 ? '+' : ''}${d.toFixed(1)} dB` };
    if (!ok) out.anyWarn = true;
  }
  out.complete = k1 !== null && k5 !== null && h100 !== null;
  return out;
}

// Suggest an overall loop pass/fail from the FINAL readings.
function suggestLoopResult(loop) {
  const f = evalField(loop.fieldFinal);
  const fr = evalFreqResponse(loop.frFinal);
  if (f.state === 'empty' || !fr.complete) return null;     // not enough data yet
  const pass = f.state === 'ok' && !fr.anyWarn;
  return pass ? 'pass' : 'fail';
}

// ---- Progress / completion helpers ----
function areaComplete(a) {
  if (!a) return false;
  if (a.na) return true;
  return !!(a.photo && a.audio && a.noise && a.height);
}
function irrfDoneCount(irrf) {
  return IRRF_AREAS.filter(x => areaComplete(irrf.areas[x.id])).length;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

Object.assign(window, {
  STORAGE_KEY, IRRF_AREAS, AUDIO_QUALITY, NOISE_LEVELS, AUDIO_TONE, NOISE_TONE,
  freshState, loadState, saveState, clearState, downscaleImage,
  evalField, evalFreqResponse, suggestLoopResult,
  areaComplete, irrfDoneCount, fmtDate, num,
});
