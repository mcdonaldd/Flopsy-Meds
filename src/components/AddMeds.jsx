import { useState } from 'react';
import { useMeds } from '../state/MedsContext';
import Intake from './Intake';
import MedForm from './MedForm';
import ExtractionHistory from './ExtractionHistory';

export default function AddMeds() {
  const { actions } = useMeds();
  // Bumped after each manual save to remount the form with blank fields.
  const [formKey, setFormKey] = useState(0);
  const [savedName, setSavedName] = useState('');

  return (
    <section className="stack-xl">
      <div className="stack-md">
        <h2 className="headline-md">From discharge paperwork</h2>
        <Intake />
      </div>
      <hr className="divider" />
      <div className="stack-md">
        <h2 className="headline-md">Add manually</h2>
        {savedName && <p className="body-sm">✓ Added {savedName} to the tracker.</p>}
        <div className="card card--paper">
          <div className="card__face">
            <MedForm
              key={formKey}
              saveLabel="Add medication"
              onSave={async (med) => {
                await actions.addMed(med);
                setSavedName(med.name);
                setFormKey((k) => k + 1);
              }}
            />
          </div>
        </div>
      </div>
      <hr className="divider" />
      <ExtractionHistory />
    </section>
  );
}
