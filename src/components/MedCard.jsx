import { useState } from 'react';
import { useMeds } from '../state/MedsContext';
import { COLOR_TAGS } from '../data/constants';
import { formatTime } from '../lib/dates';

export default function MedCard({ med, day }) {
  const { state, actions } = useMeds();
  const entry = state.doseLog[day]?.[med.id] ?? { given: false, givenAt: null, note: '' };
  const [showNote, setShowNote] = useState(Boolean(entry.note));

  const givenTime = entry.givenAt
    ? new Date(entry.givenAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className={`card med-card ${entry.given ? 'med-card--done' : ''}`}>
      <div className="card__face">
        <div className="med-card__row">
          <label className="check med-card__check">
            <input
              className="check__input"
              type="checkbox"
              checked={entry.given}
              onChange={() => actions.toggleDose(day, med.id)}
              aria-label={`Mark ${med.name} as ${entry.given ? 'not given' : 'given'}`}
            />
            <span className="check__box" />
          </label>
          <div className="med-card__body">
            <div className="med-card__head">
              <span className="color-dot" style={{ background: COLOR_TAGS[med.color] ?? COLOR_TAGS.coral }} />
              <h3 className="title-md med-card__name">{med.name}</h3>
              {med.shortTerm && <span className="badge badge--accent">Short-term</span>}
            </div>
            <p className="body-md med-card__dose">
              {med.scheduledTime && (
                <span className="med-card__time">{formatTime(med.scheduledTime)} · </span>
              )}
              <strong>{med.dose}</strong> · {med.timing}
            </p>
            {med.instructions && <p className="body-sm">{med.instructions}</p>}
            {entry.given && givenTime && (
              <p className="body-sm med-card__given">Given at {givenTime}</p>
            )}
            {showNote ? (
              <textarea
                className="input med-card__note"
                rows={2}
                placeholder="Note for this dose (e.g. ate half, spat out)…"
                value={entry.note}
                onChange={(e) => actions.setDoseNote(day, med.id, e.target.value)}
              />
            ) : (
              <button type="button" className="link-btn body-sm" onClick={() => setShowNote(true)}>
                + Add note
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
