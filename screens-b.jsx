// ============================================================
// screens-b.jsx — IR/RF hub · Area detail · Equipment · Close-out · Declaration
// ============================================================

// ---------- IR/RF hub ----------
function IrrfHubScreen({ data, onOpenArea }) {
  const done = window.irrfDoneCount(data.irrf);
  const total = window.IRRF_AREAS.length;
  return (
    <div>
      <div className="ha-eyebrow">IR / RF Coverage</div>
      <h1 className="ha-h1">Measurement points</h1>
      <p className="ha-lede">
        Move to each point in turn. Capture a photo and rate audio quality and noise —
        or mark the point N/A if it doesn't exist in this room.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div className="ha-progress" style={{ flex: 1, borderRadius: 100 }}>
          <div className="ha-progress-fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <span className="ha-step-count">{done}/{total} done</span>
      </div>

      {window.IRRF_AREAS.map((a, i) => {
        const rec = data.irrf.areas[a.id];
        const complete = window.areaComplete(rec);
        let chip;
        if (rec && rec.na) chip = <Chip kind="na">N/A</Chip>;
        else if (complete) chip = <Chip kind="done"><Icon name="check" size={12} stroke={3} /> Done</Chip>;
        else chip = <Chip kind="todo">To do</Chip>;
        let sub = 'Not started';
        if (rec && rec.na) sub = rec.naNote ? `N/A — ${rec.naNote}` : 'Marked not applicable';
        else if (complete) sub = `${rec.audio} · noise ${rec.noise.toLowerCase()}`;
        else if (rec && (rec.audio || rec.photo)) sub = 'In progress';
        return (
          <button key={a.id} className="ha-row" onClick={() => onOpenArea(a.id)}>
            <div className="ha-row-icon" style={{ fontWeight: 800, fontSize: 15, color: 'var(--grey-500)' }}>
              {i + 1}
            </div>
            <div className="ha-row-main">
              <div className="ha-row-title">{a.name}</div>
              <div className="ha-row-sub">{sub}</div>
            </div>
            {chip}
            <span className="ha-row-chev"><Icon name="chevron-right" size={18} /></span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Area detail ----------
function AreaDetailScreen({ area, rec, setArea }) {
  const r = rec || {};
  const na = !!r.na;
  return (
    <div>
      <div className="ha-eyebrow">IR / RF Measurement</div>
      <h1 className="ha-h1">{area.name}</h1>

      <Field label="Point not applicable?" hint="Use if this area doesn't exist in this courtroom.">
        <YesNo value={na} onChange={v => setArea(area.id, 'na', v)}
               yesLabel="Mark N/A" noLabel="Measure it" />
      </Field>

      {na ? (
        <Field label="Reason" optional>
          <Textarea value={r.naNote} onChange={v => setArea(area.id, 'naNote', v)}
                    placeholder="e.g. No public gallery on this side." rows={2} />
        </Field>
      ) : (
        <>
          <div className="ha-section-label">Photo</div>
          <Field label={`Photo of ${area.name.toLowerCase()}`}>
            <PhotoCapture value={r.photo} onChange={v => setArea(area.id, 'photo', v)}
                          label="Capture point" sub="Show receiver position" />
          </Field>

          <div className="ha-section-label">Measurements</div>
          <Field label="Listening height">
            <NumberInput value={r.height} onChange={v => setArea(area.id, 'height', v)}
                         suffix="m" placeholder={area.defH} />
          </Field>
          <Field label="Audio quality listening test">
            <Segmented options={window.AUDIO_QUALITY} value={r.audio}
                       tones={window.AUDIO_TONE} columns={2}
                       onChange={v => setArea(area.id, 'audio', v)} />
          </Field>
          <Field label="Noise listening test">
            <Segmented options={window.NOISE_LEVELS} value={r.noise}
                       tones={window.NOISE_TONE} columns={2}
                       onChange={v => setArea(area.id, 'noise', v)} />
          </Field>
        </>
      )}
    </div>
  );
}

// ---------- Equipment ----------
function EquipmentScreen({ data, setIrrf }) {
  const e = data.irrf;
  return (
    <div>
      <div className="ha-eyebrow">IR / RF System</div>
      <h1 className="ha-h1">Equipment</h1>
      <p className="ha-lede">Record the installed receivers and emitters and confirm entrance signage.</p>

      <Field label="Model of receivers">
        <TextInput value={e.receiverModel} onChange={v => setIrrf('receiverModel', v)}
                   placeholder="e.g. Sennheiser SET 830s" />
      </Field>
      <Field label="Receiver quantity">
        <NumberInput value={e.receiverQty} onChange={v => setIrrf('receiverQty', v)} placeholder="0" />
      </Field>

      <hr className="ha-divider" />

      <Field label="Model of emitters">
        <TextInput value={e.emitterModel} onChange={v => setIrrf('emitterModel', v)}
                   placeholder="e.g. Sennheiser SI30, SZI30" />
      </Field>
      <Field label="Emitter quantity">
        <NumberInput value={e.emitterQty} onChange={v => setIrrf('emitterQty', v)} placeholder="0" />
      </Field>

      <hr className="ha-divider" />

      <Field label="Signage at entrances?">
        <YesNo value={e.signage} onChange={v => setIrrf('signage', v)} />
      </Field>
    </div>
  );
}

// ---------- Close-out photos ----------
function CloseoutScreen({ data, setCloseout }) {
  const c = data.closeout;
  return (
    <div>
      <div className="ha-eyebrow">Documentation</div>
      <h1 className="ha-h1">Close-out photos</h1>
      <p className="ha-lede">Two photos for the record before sign-off.</p>

      <Field label="Courtroom BWOF" hint="Building Warrant of Fitness on display.">
        <PhotoCapture value={c.bwofPhoto} onChange={v => setCloseout('bwofPhoto', v)}
                      label="Capture BWOF" sub="Camera or gallery" />
      </Field>
      <Field label="Hearing Assistance signage" hint="Entrance / room HA signage.">
        <PhotoCapture value={c.signagePhoto} onChange={v => setCloseout('signagePhoto', v)}
                      label="Capture signage" sub="Camera or gallery" />
      </Field>
    </div>
  );
}

// ---------- Declaration ----------
function DeclarationScreen({ data, setDecl }) {
  const d = data.declaration;
  const loop = data.loop;
  const naCount = window.IRRF_AREAS.filter(a => data.irrf.areas[a.id] && data.irrf.areas[a.id].na).length;
  const recorded = window.irrfDoneCount(data.irrf);
  const loopShown = loop.installed === true;

  return (
    <div>
      <div className="ha-eyebrow">Sign-off</div>
      <h1 className="ha-h1">Declaration</h1>
      <p className="ha-lede">Confirm the overall result and sign. This produces the report.</p>

      <div className="ha-summary ha-card">
        <div className="ha-summary-item">
          <span className="ha-summary-k">Courtroom</span>
          <span className="ha-summary-v">{data.meta.courtroom || '—'}</span>
        </div>
        {loopShown && (
          <div className="ha-summary-item">
            <span className="ha-summary-k">Induction loop</span>
            <span className="ha-summary-v">
              {loop.result ? <Chip kind={loop.result}>{loop.result}</Chip> : '—'}
            </span>
          </div>
        )}
        <div className="ha-summary-item">
          <span className="ha-summary-k">IR/RF points recorded</span>
          <span className="ha-summary-v">{recorded} of {window.IRRF_AREAS.length}{naCount ? ` · ${naCount} N/A` : ''}</span>
        </div>
      </div>

      <div className="ha-section-label">Overall result</div>
      <div className="ha-decision">
        <button type="button" className={'ha-decision-opt pass' + (d.result === 'pass' ? ' is-on' : '')}
                onClick={() => setDecl('result', 'pass')}>
          <div className="dlabel">Pass</div>
          <div className="dsub">System commissioned</div>
        </button>
        <button type="button" className={'ha-decision-opt fail' + (d.result === 'fail' ? ' is-on' : '')}
                onClick={() => setDecl('result', 'fail')}>
          <div className="dlabel">Fail</div>
          <div className="dsub">Does not meet spec</div>
        </button>
      </div>

      <Field label="Notes" optional>
        <Textarea value={d.notes} onChange={v => setDecl('notes', v)}
                  placeholder="Any remediation actions, caveats or follow-up…" rows={3} />
      </Field>

      <div className="ha-section-label">Signed</div>
      <Field label="Name">
        <TextInput value={d.name} onChange={v => setDecl('name', v)}
                   placeholder={data.meta.technician || 'Engineer name'} />
      </Field>
      <Field label="Date">
        <TextInput type="date" value={d.date} onChange={v => setDecl('date', v)} />
      </Field>
    </div>
  );
}

Object.assign(window, {
  IrrfHubScreen, AreaDetailScreen, EquipmentScreen, CloseoutScreen, DeclarationScreen,
});
