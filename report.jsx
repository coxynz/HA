// ============================================================
// report.jsx — Vega-branded commissioning report (A4 pages)
// Rendered into #print-root for printing and into the preview overlay.
// ============================================================

function RpEvalCell({ value, evalRes }) {
  if (value === '' || value === null || value === undefined)
    return <td className="num muted">—</td>;
  if (!evalRes || evalRes.state === 'empty') return <td className="num">{value} dB</td>;
  return (
    <td className={'num ' + (evalRes.state === 'ok' ? 'ok' : 'bad')}>
      {value} dB
    </td>
  );
}

function Report({ data }) {
  const { meta, loop, irrf, closeout, declaration } = data;
  const loopShown = loop.installed === true;
  const result = declaration.result;

  const fInit = window.evalField(loop.fieldInitial);
  const fFinal = window.evalField(loop.fieldFinal);
  const frI = window.evalFreqResponse(loop.frInit);
  const frF = window.evalFreqResponse(loop.frFinal);

  // collect photos
  const photos = [];
  if (loop.photo) photos.push({ src: loop.photo, cap: 'Induction Loop', sub: "Judge's desk / amplifier" });
  window.IRRF_AREAS.forEach(a => {
    const r = irrf.areas[a.id];
    if (r && r.photo && !r.na) photos.push({ src: r.photo, cap: a.name, sub: 'IR/RF measurement point' });
  });
  if (closeout.bwofPhoto) photos.push({ src: closeout.bwofPhoto, cap: 'Courtroom BWOF', sub: 'Building Warrant of Fitness' });
  if (closeout.signagePhoto) photos.push({ src: closeout.signagePhoto, cap: 'HA Signage', sub: 'Entrance / room signage' });
  // chunk 6 per page
  const photoPages = [];
  for (let i = 0; i < photos.length; i += 6) photoPages.push(photos.slice(i, i + 6));

  const yn = v => v === true ? 'Yes' : v === false ? 'No' : '—';
  const today = window.fmtDate(declaration.date);
  let pageNo = 0;
  const totalPages = 2 + photoPages.length;
  const Foot = () => (
    <div className="rp-foot">
      <span>Vega NZ · Hearing Assistance Commissioning · IEC 60118-4:2006</span>
      <span>{meta.jobRef || '—'} · Page {++pageNo} of {totalPages}</span>
    </div>
  );

  return (
    <div className="rp">
      {/* ---------- PAGE 1 ---------- */}
      <div className="rp-page">
        <div className="rp-head">
          <div>
            <img className="rp-head-logo" src="assets/vega_logo_white.png" alt="Vega" />
            <p className="rp-head-eyebrow">Vega NZ · Field Service Report</p>
            <h1 className="rp-head-title">Hearing Assistance Commissioning</h1>
          </div>
          {result && (
            <div className={'rp-stamp ' + result}>
              <div className="s-label">{result === 'pass' ? 'Pass' : 'Fail'}</div>
              <div className="s-sub">IEC 60118-4</div>
            </div>
          )}
        </div>

        <div className="rp-meta">
          <div><div className="k">Courtroom</div><div className="v">{meta.courtroom || '—'}</div></div>
          <div><div className="k">Location</div><div className="v">{meta.location || '—'}</div></div>
          <div><div className="k">Job / Ref</div><div className="v">{meta.jobRef || '—'}</div></div>
          <div><div className="k">Date</div><div className="v">{window.fmtDate(meta.date) || '—'}</div></div>
        </div>

        <div className="rp-block">
          <div className="rp-sec"><h2>Induction Loop</h2><span className="rule" /></div>
          {loopShown ? (
            <>
              <table className="rp-table" style={{ marginBottom: 16 }}>
                <thead><tr><th>Field strength · 1 kHz sine (target 0 ±3 dB)</th><th>Initial</th><th>Final</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Measured level</td>
                    <RpEvalCell value={loop.fieldInitial} evalRes={fInit} />
                    <RpEvalCell value={loop.fieldFinal} evalRes={fFinal} />
                  </tr>
                </tbody>
              </table>
              <table className="rp-table">
                <thead><tr><th>Frequency response (±3 dB of 1 kHz)</th><th>5 kHz</th><th>1 kHz</th><th>100 Hz</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Initial</td>
                    <RpEvalCell value={loop.frInit.k5} evalRes={frI.k5} />
                    <td className="num">{loop.frInit.k1 !== '' ? loop.frInit.k1 + ' dB' : <span className="muted">—</span>}</td>
                    <RpEvalCell value={loop.frInit.h100} evalRes={frI.h100} />
                  </tr>
                  <tr>
                    <td>Final</td>
                    <RpEvalCell value={loop.frFinal.k5} evalRes={frF.k5} />
                    <td className="num">{loop.frFinal.k1 !== '' ? loop.frFinal.k1 + ' dB' : <span className="muted">—</span>}</td>
                    <RpEvalCell value={loop.frFinal.h100} evalRes={frF.h100} />
                  </tr>
                </tbody>
              </table>
              <div className="rp-kv">
                <div><span className="k">Areas &gt; −22 dB</span><span className="v">{loop.areas22 || 'None'}</span></div>
                <div><span className="k">Areas &gt; −32 dB</span><span className="v">{loop.areas32 || 'None'}</span></div>
                <div><span className="k">Overspill test required</span><span className="v">{yn(loop.overspillRequired)}</span></div>
                <div><span className="k">Signage at entrances</span><span className="v">{yn(loop.signage)}</span></div>
                <div><span className="k">Amplifier model</span><span className="v">{loop.ampModel || '—'}</span></div>
                <div><span className="k">Loop declaration</span><span className="v">{loop.result ? <span className={'rp-pill ' + loop.result}>{loop.result}</span> : '—'}</span></div>
              </div>
              {loop.bgNoise && <div className="rp-note" style={{ marginTop: 16 }}><b>Background noise:</b> {loop.bgNoise}</div>}
            </>
          ) : (
            <div className="rp-note">No Judge's induction loop is installed in this courtroom. Hearing assistance is provided by the IR/RF system documented below.</div>
          )}
        </div>
        <Foot />
      </div>

      {/* ---------- PAGE 2 ---------- */}
      <div className="rp-page">
        <div className="rp-block">
          <div className="rp-sec"><h2>IR / RF Coverage</h2><span className="rule" /></div>
          <table className="rp-table">
            <thead><tr><th>Measurement point</th><th>Height</th><th>Audio quality</th><th>Noise</th><th>Status</th></tr></thead>
            <tbody>
              {window.IRRF_AREAS.map(a => {
                const r = irrf.areas[a.id] || {};
                if (r.na) return (
                  <tr key={a.id} className="na">
                    <td>{a.name}</td><td colSpan={3}>{r.naNote || 'Not applicable'}</td>
                    <td><span className="rp-pill na">N/A</span></td>
                  </tr>
                );
                return (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className="num">{r.height ? r.height + ' m' : <span className="muted">—</span>}</td>
                    <td>{r.audio || <span className="muted">—</span>}</td>
                    <td>{r.noise || <span className="muted">—</span>}</td>
                    <td>{window.areaComplete(r) ? <span className="rp-pill pass">Done</span> : <span className="muted">Incomplete</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rp-block">
          <div className="rp-sec"><h2>Equipment</h2><span className="rule" /></div>
          <div className="rp-kv">
            <div><span className="k">Receivers</span><span className="v">{irrf.receiverModel || '—'}</span></div>
            <div><span className="k">Receiver quantity</span><span className="v">{irrf.receiverQty || '—'}</span></div>
            <div><span className="k">Emitters</span><span className="v">{irrf.emitterModel || '—'}</span></div>
            <div><span className="k">Emitter quantity</span><span className="v">{irrf.emitterQty || '—'}</span></div>
            <div><span className="k">Signage at entrances</span><span className="v">{yn(irrf.signage)}</span></div>
          </div>
        </div>

        <div className="rp-block">
          <div className="rp-sec"><h2>Declaration</h2><span className="rule" /></div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--grey-700)', margin: '0 0 14px' }}>
            The system has been commissioned and assessed for performance as required by
            <b style={{ color: 'var(--ink)' }}> IEC 60118-4:2006</b>. Overall result:
            {' '}{result ? <span className={'rp-pill ' + result}>{result}</span> : <span className="muted">pending</span>}.
          </p>
          {declaration.notes && <div className="rp-note">{declaration.notes}</div>}
          <div className="rp-sign">
            <div className="line">
              <div className="sig">{declaration.name || meta.technician || ' '}</div>
              <div className="cap">Signed</div>
            </div>
            <div className="line" style={{ maxWidth: 200 }}>
              <div className="sig" style={{ fontStyle: 'normal' }}>{today || ' '}</div>
              <div className="cap">Date</div>
            </div>
          </div>
        </div>
        <Foot />
      </div>

      {/* ---------- PHOTO APPENDIX ---------- */}
      {photoPages.map((pg, pi) => (
        <div className="rp-page" key={pi}>
          <div className="rp-sec"><h2>Photographic Record{photoPages.length > 1 ? ` (${pi + 1}/${photoPages.length})` : ''}</h2><span className="rule" /></div>
          <div className="rp-photos">
            {pg.map((p, i) => (
              <div className="rp-photo" key={i}>
                <figure>
                  <img className="img" src={p.src} alt={p.cap} />
                  <figcaption>{p.cap}<div className="sub">{p.sub}</div></figcaption>
                </figure>
              </div>
            ))}
          </div>
          <Foot />
        </div>
      ))}
    </div>
  );
}

window.Report = Report;
