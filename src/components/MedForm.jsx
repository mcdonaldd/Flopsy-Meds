import { useState } from 'react';
import { COLOR_TAGS } from '../data/constants';

const EMPTY = {
  name: '',
  dose: '',
  timing: '',
  scheduledTime: '',
  instructions: '',
  shortTerm: false,
  endDate: '',
  color: 'coral',
};

export default function MedForm({ initial, onSave, onCancel, saveLabel = 'Save medication', allowMultipleTimes = false }) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    endDate: initial?.endDate ?? '',
    scheduledTime: initial?.scheduledTime ?? '',
  });
  // Extra time slots when allowMultipleTimes is on (beyond the first slot in form.scheduledTime)
  const [extraTimes, setExtraTimes] = useState([]);

  const set = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const base = {
      name: form.name.trim(),
      dose: form.dose.trim(),
      timing: form.timing.trim(),
      instructions: form.instructions.trim(),
      shortTerm: form.shortTerm,
      endDate: form.shortTerm && form.endDate ? form.endDate : null,
      color: form.color,
    };

    const allTimes = [form.scheduledTime || null, ...extraTimes.map((t) => t || null)].filter(Boolean);

    if (allowMultipleTimes && allTimes.length > 1) {
      // Return an array of med objects, one per time slot
      onSave(allTimes.map((t, i) => ({
        ...base,
        scheduledTime: t,
        timing: base.timing ? `${base.timing} (dose ${i + 1} of ${allTimes.length})` : `Dose ${i + 1} of ${allTimes.length}`,
      })));
    } else {
      onSave({ ...base, scheduledTime: form.scheduledTime || null });
    }
  }

  return (
    <form className="stack-md med-form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field__label">Name *</span>
        <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Prednisone 5mg" required />
      </label>
      <div className="med-form__grid">
        <label className="field">
          <span className="field__label">Dose</span>
          <input className="input" value={form.dose} onChange={set('dose')} placeholder="e.g. 1 tablet" />
        </label>
        <div className="field">
          <span className="field__label">Scheduled time{allowMultipleTimes && extraTimes.length > 0 ? 's' : ''}</span>
          <div className="stack-sm">
            <input
              className="input"
              type="time"
              value={form.scheduledTime}
              onChange={set('scheduledTime')}
            />
            {allowMultipleTimes && extraTimes.map((t, i) => (
              <div key={i} className="med-form__time-row">
                <input
                  className="input"
                  type="time"
                  value={t}
                  onChange={(e) => {
                    const updated = [...extraTimes];
                    updated[i] = e.target.value;
                    setExtraTimes(updated);
                  }}
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-label="Remove this time"
                  onClick={() => setExtraTimes(extraTimes.filter((_, j) => j !== i))}
                >
                  <span className="btn__face">✕</span>
                </button>
              </div>
            ))}
            {allowMultipleTimes && extraTimes.length < 3 && (
              <button
                type="button"
                className="link-btn body-sm"
                onClick={() => setExtraTimes([...extraTimes, ''])}
              >
                + Add another time
              </button>
            )}
          </div>
        </div>
      </div>
      <label className="field">
        <span className="field__label">Timing / frequency note</span>
        <input className="input" value={form.timing} onChange={set('timing')} placeholder="e.g. Morning, with food" />
      </label>
      <label className="field">
        <span className="field__label">Instructions</span>
        <textarea className="input" rows={2} value={form.instructions} onChange={set('instructions')} placeholder="e.g. Give with food. No dairy." />
      </label>
      <div className="med-form__grid">
        <label className="check med-form__check">
          <input className="check__input" type="checkbox" checked={form.shortTerm} onChange={set('shortTerm')} />
          <span className="check__box" />
          <span className="body-md">Short-term medication</span>
        </label>
        {form.shortTerm && (
          <label className="field">
            <span className="field__label">End date</span>
            <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
          </label>
        )}
      </div>
      <div className="field">
        <span className="field__label">Color tag</span>
        <div className="color-picker">
          {Object.entries(COLOR_TAGS).map(([key, hex]) => (
            <button
              key={key}
              type="button"
              className={`color-swatch ${form.color === key ? 'color-swatch--selected' : ''}`}
              style={{ background: hex }}
              title={key}
              aria-label={`Color: ${key}`}
              aria-pressed={form.color === key}
              onClick={() => setForm({ ...form, color: key })}
            />
          ))}
        </div>
      </div>
      <div className="med-form__actions">
        <button type="submit" className="btn btn--primary">
          <span className="btn__face">{saveLabel}</span>
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            <span className="btn__face">Cancel</span>
          </button>
        )}
      </div>
    </form>
  );
}
