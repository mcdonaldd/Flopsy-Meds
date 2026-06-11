import { useState } from 'react';
import { useMeds } from '../state/MedsContext';

function ExtractionCard({ extraction }) {
  const { state } = useMeds();
  const [open, setOpen] = useState(false);

  const linkedMeds = state.meds.filter((m) => m.extractionId === extraction.id);
  const date = new Date(extraction.extractedAt).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="card">
      <div className="card__face">
        <div className="extraction-card__header" onClick={() => setOpen((o) => !o)}>
          <div className="extraction-card__meta">
            <p className="title-md extraction-card__filename">📄 {extraction.filename}</p>
            <p className="body-sm extraction-card__date">{date} · {extraction.output.length} medication{extraction.output.length === 1 ? '' : 's'} found · {linkedMeds.length} added</p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm">
            <span className="btn__face">{open ? 'Hide' : 'View output'}</span>
          </button>
        </div>

        {open && (
          <div className="extraction-card__output stack-sm">
            <div className="extraction-output-table">
              <div className="extraction-output-table__head">
                <span>Medication</span>
                <span>Dose</span>
                <span>Timing</span>
                <span>Status</span>
              </div>
              {extraction.output.map((item, i) => {
                const added = linkedMeds.some(
                  (m) => m.name === item.name && m.dose === item.dose
                );
                return (
                  <div key={i} className="extraction-output-table__row">
                    <span className="body-sm"><strong>{item.name}</strong></span>
                    <span className="body-sm">{item.dose}</span>
                    <span className="body-sm">{item.timing}</span>
                    <span className="body-sm">
                      {added
                        ? <span className="badge badge--accent">Added</span>
                        : <span className="badge">Not added</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExtractionHistory() {
  const { state } = useMeds();

  if (state.extractions.length === 0) return null;

  return (
    <div className="stack-md">
      <h2 className="headline-md">Source documents</h2>
      <p className="body-sm">Every file that has been used to generate medications, and what was found in each one.</p>
      <div className="stack-md">
        {state.extractions.map((ex) => (
          <ExtractionCard key={ex.id} extraction={ex} />
        ))}
      </div>
    </div>
  );
}
