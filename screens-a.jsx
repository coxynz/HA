// ============================================================
// screens-a.jsx — Setup · Loop gate · Induction Loop checks
// Each screen renders body content only; App owns chrome + nav.
// ============================================================

// ---------- Start / hero ----------
function StartScreen({ hasSaved, onStart, onResume }) {
  return (
    <div className="ha-hero">
      <div className="ha-hero-top">
        <div className="ha-hero-glow" />
        <img className="ha-hero-logo" src="assets/vega_logo_white.png"
             style={{ filter: 'brightness(0) invert(1)' }} alt="Vega" />
        <div className="ha-hero-eyebrow">Vega NZ · Field Service</div>
        <h1 className="ha-hero-h1">Hearing<br/>Assistance Check</h1>
        <p className="ha-hero-sub">
          Guided courtroom commissioning to IEC 60118-4:2006 — induction loop,
          IR/RF coverage, signage and sign-off, all in one report.
        </p>
      </div>
      <div className="ha-hero-foot">
        {hasSaved && (
          <button className="ha-btn ha-btn-primary" style={{ width: '100%', marginBottom: 10 }}
                  onClick={onResume}>Resume check in progress</button>
        )}
        <button className={'ha-btn ' + (hasSaved ? 'ha-btn-ghost' : 'ha-btn-primary')}
                style={{ width: '100%', background: hasSaved ? 'transparent' : undefined,
                         color: hasSaved ? '#fff' : undefined, borderColor: hasSaved ? 'rgba(255,255,255,0.4)' : undefined }}
                onClick={onStart}>
          {hasSaved ? 'Start a new check' : 'Begin new check'}
        </button>
      </div>
    </div>
  );
}

// ---------- Setup ----------
function SetupScreen({ data, setMeta }) {
  const m = data.meta;
  return (
    <div>
      <h1 className="ha-h1">Site details</h1>
      <p className="ha-lede">Identify the room and job. This carries through to the report header.</p>
      <Field label="Courtroom name / number">
        <TextInput value={m.courtroom} onChange={v => setMeta('courtroom', v)}
                   placeholder="e.g. Courtroom 4" />
      </Field>
      <Field label="Court location">
        <TextInput value={m.location} onChange={v => setMeta('location', v)}
                   placeholder="e.g. Auckland District Court" />
      </Field>
      <Field label="Technician / engineer">
        <TextInput value={m.technician} onChange={v => setMeta('technician', v)}
                   placeholder="Your name" />
      </Field>
      <div className="ha-grid-2">
        <Field label="Job / reference no.">
          <TextInput value={m.jobRef} onChange={v => setMeta('jobRef', v)}
                     placeholder="e.g. NZ-10482" />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={m.date} onChange={v => setMeta('date', v)} />
        </Field>
      </div>
    </div>
  );
}

// ---------- Loop gate ----------
function LoopGateScreen({ data, setLoop }) {
  const installed = data.loop.installed;
  return (
    <div>
      <div className="ha-row-icon" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 18 }}>
        <Icon name="ear" size={28} stroke={2} />
      </div>
      <h1 className="ha-h1">Judge's induction loop</h1>
      <p className="ha-lede">
        Is a hearing induction loop installed at the Judge's desk? If not, we'll go
        straight to the IR/RF coverage checks.
      </p>
      <Field label="Induction loop installed?">
        <YesNo value={installed}
               onChange={v => setLoop('installed', v)}
               yesLabel="Yes — run loop checks" noLabel="No — skip" />
      </Field>
      {installed === true && (
        <div className="ha-note" style={{ marginTop: 18 }}>
          You'll be guided through field strength, frequency response and overspill
          measurements at the <b>Judge's desk</b>, evaluated against IEC 60118-4:2006.
        </div>
      )}
    </div>
  );
}

// ---------- Induction Loop checks ----------
function LoopScreen({ data, setLoop, setLoopFr }) {
  const l = data.loop;
  const fieldInit = window.evalField(l.fieldInitial);
  const fieldFinal = window.evalField(l.fieldFinal);
  const frInit = window.evalFreqResponse(l.frInit);
  const frFinal = window.evalFreqResponse(l.frFinal);
  const suggestion = window.suggestLoopResult(l);

  function FreqBlock({ which, fr, evalRes }) {
    return (
      <div className="ha-card">
        <div className="ha-row-title" style={{ marginBottom: 12 }}>
          {which === 'frInit' ? 'Initial' : 'Final'} readings
        </div>
        <div className="ha-grid-3">
          <Field label="5 kHz">
            <NumberInput value={fr.k5} onChange={v => setLoopFr(which, 'k5', v)} suffix="dB" placeholder="0" />
          </Field>
          <Field label="1 kHz">
            <NumberInput value={fr.k1} onChange={v => setLoopFr(which, 'k1', v)} suffix="dB" placeholder="0" />
          </Field>
          <Field label="100 Hz">
            <NumberInput value={fr.h100} onChange={v => setLoopFr(which, 'h100', v)} suffix="dB" placeholder="0" />
          </Field>
        </div>
        <EvalFlag result={evalRes.k5} />
        <EvalFlag result={evalRes.h100} />
      </div>
    );
  }

  return (
    <div>
      <div className="ha-eyebrow">Induction Loop · Judge's Desk</div>
      <h1 className="ha-h1">Loop measurements</h1>

      <Field label="Measurement height">
        <NumberInput value={l.height} onChange={v => setLoop('height', v)} suffix="m" placeholder="1.2" />
      </Field>

      <div className="ha-section-label">Field strength</div>
      <div className="ha-note">
        <b>1 kHz sine, target 0 ±3 dB.</b> Pink noise reference −6 ±3 dB.
      </div>
      <Field label="Initial">
        <NumberInput value={l.fieldInitial} onChange={v => setLoop('fieldInitial', v)} suffix="dB" placeholder="0.0" />
        <EvalFlag result={fieldInit} />
      </Field>
      <Field label="Final">
        <NumberInput value={l.fieldFinal} onChange={v => setLoop('fieldFinal', v)} suffix="dB" placeholder="0.0" />
        <EvalFlag result={fieldFinal} />
      </Field>

      <div className="ha-section-label">Frequency response</div>
      <div className="ha-note">
        With pink noise, <b>5 kHz and 100 Hz must sit within ±3 dB of the 1 kHz level.</b>
        Enter the measured level at each band.
      </div>
      <FreqBlock which="frInit" fr={l.frInit} evalRes={frInit} />
      <FreqBlock which="frFinal" fr={l.frFinal} evalRes={frFinal} />

      <div className="ha-section-label">Background noise</div>
      <Field label="Problem zones" hint="Investigate the target coverage area and note any noise hot-spots." optional>
        <Textarea value={l.bgNoise} onChange={v => setLoop('bgNoise', v)}
                  placeholder="Describe any problem zones on the floorplan…" />
      </Field>
      <div className="ha-grid-2">
        <Field label="Areas > −22 dB">
          <TextInput value={l.areas22} onChange={v => setLoop('areas22', v)} placeholder="None" />
        </Field>
        <Field label="Areas > −32 dB">
          <TextInput value={l.areas32} onChange={v => setLoop('areas32', v)} placeholder="None" />
        </Field>
      </div>

      <div className="ha-section-label">Overspill & equipment</div>
      <Field label="Overspill test required?">
        <YesNo value={l.overspillRequired} onChange={v => setLoop('overspillRequired', v)} />
      </Field>
      <Field label="Model of induction loop amplifier">
        <TextInput value={l.ampModel} onChange={v => setLoop('ampModel', v)}
                   placeholder="e.g. Ampetronic ILD500" />
      </Field>
      <Field label="Signage at entrances?">
        <YesNo value={l.signage} onChange={v => setLoop('signage', v)} />
      </Field>

      <div className="ha-section-label">Photo</div>
      <Field label="Loop amplifier / Judge's desk">
        <PhotoCapture value={l.photo} onChange={v => setLoop('photo', v)}
                      label="Capture loop install" sub="Camera or gallery" />
      </Field>

      <div className="ha-section-label">Loop declaration · IEC 60118-4:2006</div>
      {suggestion && (
        <div className={'ha-flag ' + (suggestion === 'pass' ? 'ok' : 'warn')} style={{ marginBottom: 12, marginTop: 0 }}>
          <Icon name={suggestion === 'pass' ? 'check' : 'alert'} size={16} stroke={2.6} />
          <span>Final readings suggest a <b>{suggestion.toUpperCase()}</b> — confirm below.</span>
        </div>
      )}
      <div className="ha-decision">
        <button type="button" className={'ha-decision-opt pass' + (l.result === 'pass' ? ' is-on' : '')}
                onClick={() => setLoop('result', 'pass')}>
          <div className="dlabel">Pass</div>
          <div className="dsub">Meets performance</div>
        </button>
        <button type="button" className={'ha-decision-opt fail' + (l.result === 'fail' ? ' is-on' : '')}
                onClick={() => setLoop('result', 'fail')}>
          <div className="dlabel">Fail</div>
          <div className="dsub">Remediation needed</div>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { StartScreen, SetupScreen, LoopGateScreen, LoopScreen });
