import { useState } from 'react';
import { useMeds } from '../state/MedsContext';
import { COLOR_TAGS } from '../data/constants';
import { formatTime, medTimeSort, dateKey } from '../lib/dates';
import MedForm from './MedForm';

function ManageRow({ med, isFirst, isLast, expired }) {
  const { actions } = useMeds();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="card card--paper">
        <div className="card__face">
          <MedForm
            initial={med}
            saveLabel="Save changes"
            onSave={(changes) => {
              actions.updateMed(med.id, changes);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${med.active ? '' : 'med-row--stopped'}`}>
      <div className="card__face">
        <div className="manage-row">
          <div className="manage-row__order">
            <button
              className="order-btn"
              disabled={isFirst}
              aria-label={`Move ${med.name} earlier in the day`}
              onClick={() => actions.moveMed(med.id, 'up')}
            >
              ▲
            </button>
            <button
              className="order-btn"
              disabled={isLast}
              aria-label={`Move ${med.name} later in the day`}
              onClick={() => actions.moveMed(med.id, 'down')}
            >
              ▼
            </button>
          </div>
          <div className="manage-row__info">
            <div className="med-card__head">
              <span className="color-dot" style={{ background: COLOR_TAGS[med.color] ?? COLOR_TAGS.coral }} />
              <h3 className="title-md">{med.name}</h3>
              {med.shortTerm && !expired && <span className="badge badge--accent">Short-term{med.endDate ? ` · ends ${med.endDate}` : ''}</span>}
              {med.shortTerm && expired && <span className="badge">Expired {med.endDate}</span>}
              {!med.active && <span className="badge">Stopped</span>}
            </div>
            <p className="body-md">
              {med.scheduledTime && <span className="med-card__time">{formatTime(med.scheduledTime)} · </span>}
              <strong>{med.dose}</strong> · {med.timing}
            </p>
            {med.instructions && <p className="body-sm">{med.instructions}</p>}
          </div>
          <div className="manage-row__actions">
            <button className="btn btn--secondary btn--sm" onClick={() => setEditing(true)}>
              <span className="btn__face">Edit</span>
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => actions.setActive(med.id, !med.active)}
            >
              <span className="btn__face">{med.active ? 'Stop' : 'Restart'}</span>
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                if (window.confirm(`Remove ${med.name}? This also deletes its dose history.`)) {
                  actions.removeMed(med.id);
                }
              }}
            >
              <span className="btn__face">Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Manage() {
  const { state } = useMeds();
  const today = dateKey();
  const ordered = [...state.meds].sort(medTimeSort);
  const active = ordered.filter((m) => m.active);
  const stopped = ordered.filter((m) => !m.active);

  return (
    <section className="stack-lg">
      <div>
        <h2 className="headline-md">Manage medications</h2>
        <p className="body-sm">Listed in the order they're given across the day — use the arrows to reorder.</p>
      </div>
      <div className="stack-md">
        {active.map((med, i) => (
          <ManageRow
            key={med.id}
            med={med}
            isFirst={i === 0}
            isLast={i === active.length - 1}
            expired={Boolean(med.endDate && today > med.endDate)}
          />
        ))}
        {active.length === 0 && <p className="body-md">No active medications.</p>}
      </div>
      {stopped.length > 0 && (
        <>
          <h3 className="title-md">Stopped</h3>
          <div className="stack-md">
            {stopped.map((med, i) => (
              <ManageRow
                key={med.id}
                med={med}
                isFirst={i === 0}
                isLast={i === stopped.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
