// ============================================================
// ui.jsx — shared mobile field controls + inline icon set
// ============================================================
const { useState, useRef, useEffect } = React;

// ---- Inline icon set (2px stroke, 24-grid) ----
const ICON_PATHS = {
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'check': 'M5 13l4 4L19 7',
  'camera-body': 'M3 8a2 2 0 012-2h2l1.2-1.6A1 1 0 019 4h6a1 1 0 01.8.4L17 6h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
  'x': 'M6 6l12 12M18 6L6 18',
  'alert': 'M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.7-1.7l-8-14a1 1 0 00-1.4 0z',
  'rotate': 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8m0-5v5h5',
  'file-text': 'M14 3v5h5M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5zM9 13h6M9 17h6',
  'mappin': 'M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z',
  'ear': 'M7 18v-6a5 5 0 0110 0c0 2-1 3-2 3.5s-1.5 1.5-1.5 2.5a2 2 0 01-4 0',
  'radio': 'M5 12a7 7 0 0114 0M8.5 12a3.5 3.5 0 017 0M12 12v6m-2 2h4',
  'clipboard': 'M9 4h6a1 1 0 011 1v1h1a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2h1V5a1 1 0 011-1zM9 6h6',
  'sign': 'M4 20h16M6 16l4-12 4 12M7.5 12h5',
  'download': 'M12 4v10m0 0l-4-4m4 4l4-4M5 19h14',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
};
function Icon({ name, size = 22, stroke = 2.2, fill = false, style }) {
  const d = ICON_PATHS[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} />
    </svg>
  );
}

// ---- Field wrapper ----
function Field({ label, hint, optional, children }) {
  return (
    <div className="ha-field">
      {label && (
        <label className="ha-label">
          {label}{optional && <span className="opt"> · optional</span>}
        </label>
      )}
      {hint && <div className="ha-hint">{hint}</div>}
      {children}
    </div>
  );
}

// ---- Text input ----
function TextInput({ value, onChange, placeholder, type = 'text', inputMode }) {
  return (
    <input className="ha-input" type={type} value={value || ''} inputMode={inputMode}
           placeholder={placeholder}
           onChange={e => onChange(e.target.value)} />
  );
}

// ---- Number input with unit suffix ----
function NumberInput({ value, onChange, placeholder, suffix, step = 'any' }) {
  return (
    <div className="ha-input-wrap">
      <input className={'ha-input' + (suffix ? ' has-suffix' : '')}
             type="number" step={step} inputMode="decimal"
             value={value === null || value === undefined ? '' : value}
             placeholder={placeholder}
             onChange={e => onChange(e.target.value)} />
      {suffix && <span className="ha-input-suffix">{suffix}</span>}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea className="ha-textarea" rows={rows} value={value || ''}
              placeholder={placeholder}
              onChange={e => onChange(e.target.value)} />
  );
}

// ---- Segmented control (single select) ----
function Segmented({ options, value, onChange, columns, tones }) {
  const cols = columns || (options.length <= 2 ? 2 : (options.length === 3 ? 3 : 2));
  return (
    <div className="ha-seg" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(opt => {
        const on = value === opt;
        const tone = on && tones ? ` tone-${tones[opt]}` : '';
        return (
          <button key={opt} type="button"
                  className={'ha-seg-opt' + (on ? ' is-on' : '') + tone}
                  onClick={() => onChange(opt)}>{opt}</button>
        );
      })}
    </div>
  );
}

// ---- Yes / No ----
function YesNo({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }) {
  return (
    <div className="ha-yesno">
      <button type="button"
              className={'ha-seg-opt' + (value === true ? ' is-on' : '')}
              onClick={() => onChange(true)}>{yesLabel}</button>
      <button type="button"
              className={'ha-seg-opt' + (value === false ? ' is-on' : '')}
              onClick={() => onChange(false)}>{noLabel}</button>
    </div>
  );
}

// ---- Evaluation flag ----
function EvalFlag({ result }) {
  if (!result || result.state === 'empty') return null;
  const ok = result.state === 'ok';
  return (
    <div className={'ha-flag ' + (ok ? 'ok' : 'warn')}>
      <Icon name={ok ? 'check' : 'alert'} size={16} stroke={2.6} />
      <span>{result.msg}</span>
    </div>
  );
}

// ---- Photo capture (live camera w/ gallery fallback) ----
function PhotoCapture({ value, onChange, label = 'Add photo', sub = 'Tap to capture' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const data = await window.downscaleImage(file, 1100, 0.7);
      onChange(data);
    } catch (err) { /* ignore */ }
    setBusy(false);
    e.target.value = '';
  }

  return (
    <div className={'ha-photo' + (value ? ' filled' : '')}
         onClick={() => { if (!value) ref.current && ref.current.click(); }}>
      <input ref={ref} type="file" accept="image/*" capture="environment"
             style={{ display: 'none' }} onChange={handleFile} />
      {value ? (
        <>
          <img src={value} alt="" />
          <button className="ha-photo-retake" type="button"
                  onClick={(e) => { e.stopPropagation(); ref.current && ref.current.click(); }}>
            <Icon name="rotate" size={13} stroke={2.6} /> Retake
          </button>
        </>
      ) : (
        <>
          <Icon name="camera-body" size={30} stroke={1.9} />
          <div className="ha-photo-label">{busy ? 'Processing…' : label}</div>
          <div className="ha-photo-sub">{busy ? '' : sub}</div>
        </>
      )}
    </div>
  );
}

// ---- Status chip ----
function Chip({ kind, children }) {
  return <span className={'ha-chip ' + kind}>{children}</span>;
}

Object.assign(window, {
  Icon, Field, TextInput, NumberInput, Textarea,
  Segmented, YesNo, EvalFlag, PhotoCapture, Chip,
});
