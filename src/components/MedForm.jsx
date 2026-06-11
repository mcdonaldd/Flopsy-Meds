import { useState } from 'react';
import { COLOR_TAGS } from '../data/constants';

const EMPTY = {
  name: '',
  dose: '',
  timing: '',
  instructions: '',
  shortTerm: false,
  endDate: '',
  color: 'coral',
};

// Shared add/edit form. Pass `initial` to edit; onSave receives the med fields.
export default function MedForm({ initial, onSave, onCancel, saveLabel = 'Save medication' }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial, endDate: initial?.endDate ?? '' });

  const set = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      dose: form.dose.trim(),
      timing: form.timing.trim(),
      instructions: form.instructions.trim(),
      shortTerm: form.shortTerm,
      endDate: form.shortTerm && form.endDate ? form.endDate : null,
      color: form.color,
    });
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
        <label className="field">
          <span className="field__label">Timing / frequency</span>
          <input className="input" value={form.timing} onChange={set('timing')} placeholder="e.g. Morning, with food" />
        </label>
      </div>
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
