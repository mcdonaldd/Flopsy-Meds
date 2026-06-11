import { useState } from 'react';
import { useMeds } from '../state/MedsContext';
import { extractMedsFromDocument } from '../lib/extractMeds';
import MedForm from './MedForm';

function ReviewCard({ med, onConfirm, onDiscard }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="card card--paper">
        <div className="card__face">
          <MedForm
            initial={med}
            saveLabel="Add to tracker"
            onSave={(changes) => onConfirm(changes)}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card card--paper">
      <div className="card__face">
        <div className="manage-row">
          <div className="manage-row__info">
            <div className="med-card__head">
              <h3 className="title-md">{med.name}</h3>
              {med.shortTerm && <span className="badge badge--accent">Short-term</span>}
            </div>
            <p className="body-md"><strong>{med.dose}</strong> · {med.timing}</p>
            {med.instructions && <p className="body-sm">{med.instructions}</p>}
          </div>
          <div className="manage-row__actions">
            <button className="btn btn--primary btn--sm" onClick={() => onConfirm(med)}>
              <span className="btn__face">Add</span>
            </button>
            <button className="btn btn--secondary btn--sm" onClick={() => setEditing(true)}>
              <span className="btn__face">Edit</span>
            </button>
            <button className="btn btn--ghost btn--sm" onClick={onDiscard}>
              <span className="btn__face">Discard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Intake() {
  const { actions } = useMeds();
  const [status, setStatus] = useState('idle'); // idle | loading | review | error
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState([]);
  const [addedCount, setAddedCount] = useState(0);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStatus('loading');
    setError('');
    setAddedCount(0);
    try {
      const meds = await extractMedsFromDocument(file);
      if (meds.length === 0) {
        setError('No medications found in that document. Try a clearer photo or PDF.');
        setStatus('error');
        return;
      }
      setExtracted(meds.map((m, i) => ({ ...m, _key: i })));
      setStatus('review');
    } catch (err) {
      setError(err?.message ?? 'Something went wrong reading the document.');
      setStatus('error');
    }
  }

  async function confirm(key, med) {
    await actions.addMed({ ...med, endDate: med.endDate ?? null, color: med.color ?? 'coral' });
    setExtracted((list) => list.filter((m) => m._key !== key));
    setAddedCount((n) => n + 1);
  }

  function discard(key) {
    setExtracted((list) => list.filter((m) => m._key !== key));
  }

  return (
    <div className="stack-md">
      <p className="body-md">
        Upload a photo or PDF of discharge paperwork. Medications are extracted automatically for
        you to review before they're added.
      </p>
      <label className={`btn btn--primary upload-btn ${status === 'loading' ? 'upload-btn--busy' : ''}`}>
        <span className="btn__face">
          {status === 'loading' ? 'Reading document…' : 'Upload photo or PDF'}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={handleFile}
          disabled={status === 'loading'}
          hidden
        />
      </label>

      {status === 'error' && (
        <div className="card card--accent">
          <div className="card__face">
            <p className="body-md error-text">{error}</p>
          </div>
        </div>
      )}

      {addedCount > 0 && (
        <p className="body-sm">✓ {addedCount} medication{addedCount === 1 ? '' : 's'} added to the tracker.</p>
      )}

      {status === 'review' && extracted.length > 0 && (
        <div className="stack-md">
          <h3 className="title-md">Found {extracted.length} medication{extracted.length === 1 ? '' : 's'} — review each one</h3>
          {extracted.map((med) => (
            <ReviewCard
              key={med._key}
              med={med}
              onConfirm={(finalMed) => confirm(med._key, finalMed)}
              onDiscard={() => discard(med._key)}
            />
          ))}
        </div>
      )}
      {status === 'review' && extracted.length === 0 && (
        <p className="body-md">All extracted medications handled. Upload another document any time.</p>
      )}
    </div>
  );
}
