import { EMERGENCY_CONTACTS, WARNING_SIGNS } from '../data/constants';

export default function EmergencyFooter() {
  return (
    <footer className="emergency-footer">
      <div className="container emergency-footer__inner">
        <div>
          <p className="eyebrow eyebrow--accent">Emergency contacts</p>
          <ul className="emergency-footer__list">
            {EMERGENCY_CONTACTS.map((c) => (
              <li key={c.name} className="body-md">
                <strong>{c.name}</strong>{' '}
                <a href={`tel:${c.phone.replace(/\D/g, '')}`}>{c.phone}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow eyebrow--accent">Watch for &amp; flag</p>
          <ul className="emergency-footer__list emergency-footer__signs">
            {WARNING_SIGNS.map((sign) => (
              <li key={sign} className="body-md">⚠ {sign}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
