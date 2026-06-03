// ============================================================
// app.jsx — state, navigation, chrome, report portal + preview
// ============================================================
const { useState, useEffect, useMemo, useRef } = React;

function hasProgress(s) {
  if (!s) return false;
  if (s.meta && (s.meta.courtroom || s.meta.technician)) return true;
  if (s.loop && s.loop.installed !== null) return true;
  if (s.irrf && Object.keys(s.irrf.areas || {}).length) return true;
  return false;
}

function App() {
  const savedAtMount = useMemo(() => window.loadState(), []);
  const [state, setState] = useState(() => savedAtMount || window.freshState());
  const [view, setView] = useState('start');
  const [activeArea, setActiveArea] = useState(null);
  const [preview, setPreview] = useState(false);
  const bodyRef = useRef(null);

  // persist
  useEffect(() => { window.saveState(state); }, [state]);
  // scroll to top on view change
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [view, activeArea]);

  const loopShown = state.loop.installed === true;

  // ---- section setters (shallow, photo-safe) ----
  const setMeta = (k, v) => setState(s => ({ ...s, meta: { ...s.meta, [k]: v } }));
  const setLoop = (k, v) => setState(s => ({ ...s, loop: { ...s.loop, [k]: v } }));
  const setLoopFr = (which, k, v) => setState(s => ({ ...s, loop: { ...s.loop, [which]: { ...s.loop[which], [k]: v } } }));
  const setArea = (id, k, v) => setState(s => ({ ...s, irrf: { ...s.irrf, areas: { ...s.irrf.areas, [id]: { ...(s.irrf.areas[id] || {}), [k]: v } } } }));
  const setIrrf = (k, v) => setState(s => ({ ...s, irrf: { ...s.irrf, [k]: v } }));
  const setCloseout = (k, v) => setState(s => ({ ...s, closeout: { ...s.closeout, [k]: v } }));
  const setDecl = (k, v) => setState(s => ({ ...s, declaration: { ...s.declaration, [k]: v } }));

  // ---- navigation ----
  const mainSteps = ['setup', 'loop-gate', ...(loopShown ? ['loop'] : []), 'irrf-hub', 'equipment', 'closeout', 'declaration'];
  function nextOf(v) {
    if (v === 'setup') return 'loop-gate';
    if (v === 'loop-gate') return loopShown ? 'loop' : 'irrf-hub';
    if (v === 'loop') return 'irrf-hub';
    if (v === 'irrf-hub') return 'equipment';
    if (v === 'equipment') return 'closeout';
    if (v === 'closeout') return 'declaration';
    if (v === 'declaration') return 'report';
    return v;
  }
  function prevOf(v) {
    if (v === 'setup') return 'start';
    if (v === 'loop-gate') return 'setup';
    if (v === 'loop') return 'loop-gate';
    if (v === 'irrf-hub') return loopShown ? 'loop' : 'loop-gate';
    if (v === 'area') return 'irrf-hub';
    if (v === 'equipment') return 'irrf-hub';
    if (v === 'closeout') return 'equipment';
    if (v === 'declaration') return 'closeout';
    if (v === 'report') return 'declaration';
    return 'start';
  }
  const goNext = () => setView(v => nextOf(v));
  const goBack = () => { const p = prevOf(view); setActiveArea(null); setView(p); };
  const openArea = (id) => { setActiveArea(id); setView('area'); };

  function startNew() {
    window.clearState();
    setState(window.freshState());
    setView('setup');
  }
  function resume() { setView(loopShown || hasProgress(state) ? 'setup' : 'setup'); }

  // ---- validation for primary button ----
  function primaryEnabled() {
    switch (view) {
      case 'setup': return !!state.meta.courtroom.trim();
      case 'loop-gate': return state.loop.installed !== null;
      case 'loop': return !!state.loop.result;
      case 'declaration': return !!state.declaration.result && !!(state.declaration.name || state.meta.technician);
      default: return true;
    }
  }

  // ---- chrome (eyebrow / title / step) ----
  const chromeMap = {
    setup: { eyebrow: 'Step 1', title: 'Site details' },
    'loop-gate': { eyebrow: 'Step 2', title: 'Induction loop' },
    loop: { eyebrow: 'Step 3', title: 'Loop measurements' },
    'irrf-hub': { eyebrow: 'IR / RF', title: 'Measurement points' },
    area: { eyebrow: 'IR / RF', title: activeArea ? (window.IRRF_AREAS.find(a => a.id === activeArea) || {}).name : 'Point' },
    equipment: { eyebrow: 'IR / RF', title: 'Equipment' },
    closeout: { eyebrow: 'Close-out', title: 'Photos' },
    declaration: { eyebrow: 'Sign-off', title: 'Declaration' },
  };
  const stepIndex = mainSteps.indexOf(view === 'area' ? 'irrf-hub' : view);
  const progress = stepIndex >= 0 ? ((stepIndex + 1) / mainSteps.length) * 100 : 0;

  // primary button label
  const primaryLabel = {
    'irrf-hub': 'Continue to equipment',
    declaration: 'Generate report',
  }[view] || (view === 'area' ? 'Save & return' : 'Continue');
  const primaryAction = view === 'area' ? () => { setActiveArea(null); setView('irrf-hub'); } : goNext;

  // ---- render body ----
  function renderBody() {
    switch (view) {
      case 'setup': return <SetupScreen data={state} setMeta={setMeta} />;
      case 'loop-gate': return <LoopGateScreen data={state} setLoop={setLoop} />;
      case 'loop': return <LoopScreen data={state} setLoop={setLoop} setLoopFr={setLoopFr} />;
      case 'irrf-hub': return <IrrfHubScreen data={state} onOpenArea={openArea} />;
      case 'area': {
        const area = window.IRRF_AREAS.find(a => a.id === activeArea);
        return <AreaDetailScreen area={area} rec={state.irrf.areas[activeArea]} setArea={setArea} />;
      }
      case 'equipment': return <EquipmentScreen data={state} setIrrf={setIrrf} />;
      case 'closeout': return <CloseoutScreen data={state} setCloseout={setCloseout} />;
      case 'declaration': return <DeclarationScreen data={state} setDecl={setDecl} />;
      default: return null;
    }
  }

  // ---- start screen ----
  if (view === 'start') {
    return (
      <StartScreen hasSaved={hasProgress(savedAtMount)}
                   onStart={startNew}
                   onResume={() => { setState(savedAtMount); setView('setup'); }} />
    );
  }

  // ---- report / done screen ----
  if (view === 'report') {
    const res = state.declaration.result;
    const printRoot = document.getElementById('print-root');
    return (
      <>
        <div className="ha-app">
          <div className="ha-body" style={{ paddingTop: 70 }}>
            <div className="ha-done-wrap">
              <div className={'ha-done-mark' + (res === 'fail' ? ' fail' : '')}>
                <Icon name={res === 'fail' ? 'alert' : 'check'} size={42} stroke={2.6} />
              </div>
              <h1 className="ha-h1" style={{ textAlign: 'center' }}>Check complete</h1>
              <p className="ha-lede" style={{ textAlign: 'center' }}>
                {state.meta.courtroom || 'Courtroom'} · result{' '}
                <b style={{ color: res === 'fail' ? 'var(--vega-red)' : 'var(--success)' }}>
                  {res ? res.toUpperCase() : '—'}
                </b>. Your commissioning report is ready.
              </p>
            </div>

            <div className="ha-card" style={{ marginTop: 8 }}>
              <div className="ha-summary-item">
                <span className="ha-summary-k">Induction loop</span>
                <span className="ha-summary-v">{loopShown ? (state.loop.result || '—') : 'Not installed'}</span>
              </div>
              <div className="ha-summary-item">
                <span className="ha-summary-k">IR/RF points</span>
                <span className="ha-summary-v">{window.irrfDoneCount(state.irrf)} / {window.IRRF_AREAS.length} recorded</span>
              </div>
              <div className="ha-summary-item">
                <span className="ha-summary-k">Photos captured</span>
                <span className="ha-summary-v">{countPhotos(state)}</span>
              </div>
            </div>

            <button className="ha-btn ha-btn-primary" style={{ width: '100%', marginBottom: 10 }}
                    onClick={() => setPreview(true)}>
              <Icon name="file-text" size={17} stroke={2.2} /> Preview report
            </button>
            <button className="ha-btn ha-btn-dark" style={{ width: '100%', marginBottom: 10 }}
                    onClick={() => window.print()}>
              <Icon name="download" size={17} stroke={2.2} /> Save as PDF
            </button>
            <button className="ha-btn ha-btn-ghost" style={{ width: '100%' }}
                    onClick={() => { setView('declaration'); }}>
              Back to declaration
            </button>
            <button className="ha-btn ha-btn-ghost" style={{ width: '100%', marginTop: 10, border: 'none', color: 'var(--grey-500)' }}
                    onClick={() => { if (confirm('Start a new check? The current one is saved on this device but will be replaced.')) startNew(); }}>
              Start a new check
            </button>
          </div>
        </div>
        {printRoot && ReactDOM.createPortal(<Report data={state} />, printRoot)}
        {preview && <PreviewOverlay data={state} onClose={() => setPreview(false)} />}
      </>
    );
  }

  // ---- standard wizard chrome ----
  const c = chromeMap[view] || {};
  return (
    <div className="ha-app">
      <div className="ha-topbar">
        <div className="ha-topbar-row">
          <button className="ha-back" onClick={goBack} aria-label="Back">
            <Icon name="chevron-left" size={20} stroke={2.4} />
          </button>
          <div className="ha-topbar-titles">
            <div className="ha-topbar-eyebrow">{c.eyebrow}</div>
            <div className="ha-topbar-title">{c.title}</div>
          </div>
          {stepIndex >= 0 && <span className="ha-step-count">{stepIndex + 1}/{mainSteps.length}</span>}
        </div>
      </div>
      <div className="ha-progress"><div className="ha-progress-fill" style={{ width: progress + '%' }} /></div>

      <div className="ha-body" ref={bodyRef}>{renderBody()}</div>

      <div className="ha-actionbar">
        {view === 'area' && (
          <button className="ha-btn ha-btn-ghost" style={{ flex: '0 0 auto' }} onClick={goBack}>
            <Icon name="chevron-left" size={16} stroke={2.4} />
          </button>
        )}
        <button className="ha-btn ha-btn-primary" disabled={!primaryEnabled()} onClick={primaryAction}>
          {primaryLabel}
          {view !== 'area' && <Icon name="arrow-right" size={17} stroke={2.3} />}
        </button>
      </div>
    </div>
  );
}

function countPhotos(s) {
  let n = 0;
  if (s.loop.photo) n++;
  window.IRRF_AREAS.forEach(a => { const r = s.irrf.areas[a.id]; if (r && r.photo && !r.na) n++; });
  if (s.closeout.bwofPhoto) n++;
  if (s.closeout.signagePhoto) n++;
  return n;
}

// ---- Preview overlay (on-screen scaled report) ----
function PreviewOverlay({ data, onClose }) {
  return (
    <div className="rp-preview-overlay" onClick={onClose}>
      <div className="rp-preview-bar" onClick={e => e.stopPropagation()}>
        <span className="ttl">Report preview</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ha-btn ha-btn-dark ha-btn-sm" onClick={() => window.print()}>
            <Icon name="download" size={14} stroke={2.3} /> Save PDF
          </button>
          <button className="ha-btn ha-btn-ghost ha-btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
      <div className="rp-preview-scroll" onClick={e => e.stopPropagation()}>
        <Report data={data} />
      </div>
    </div>
  );
}

const isMobile = window.matchMedia('(max-width: 500px)').matches;

ReactDOM.createRoot(document.getElementById('root')).render(
  isMobile ? (
    <div style={{ width: '100%', height: '100%' }}>
      <App />
    </div>
  ) : (
    <div className="stage">
      <div className="device-scale">
        <IOSDevice>
          <App />
        </IOSDevice>
      </div>
    </div>
  )
);
