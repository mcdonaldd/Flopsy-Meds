import { useState } from 'react';
import { useAuth } from '../state/AuthContext';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(‘’);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(‘’);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(‘’);
    setBusy(true);
    try {
      if (mode === ‘login’) {
        await login(email, password);
      } else {
        const { confirmationRequired } = await register(email, password);
        if (confirmationRequired) setConfirming(email);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <div className="auth-screen">
        <div className="auth-card card">
          <div className="card__face stack-md">
            <div>
              <p className="eyebrow eyebrow--accent">Recovery tracker</p>
              <h1 className="headline-md">Flopsy’s Meds 🐕</h1>
            </div>
            <p className="body-md">
              Check your inbox — we sent a confirmation link to <strong>{confirming}</strong>. Click it to finish creating your account, then come back and sign in.
            </p>
            <button
              type="button"
              className="link-btn body-sm"
              onClick={() => { setConfirming(‘’); setMode(‘login’); }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card card">
        <div className="card__face stack-md">
          <div>
            <p className="eyebrow eyebrow--accent">Recovery tracker</p>
            <h1 className="headline-md">Flopsy’s Meds 🐕</h1>
          </div>
          <p className="body-md">
            {mode === ‘login’ ? ‘Sign in to see the daily checklist.’ : ‘Create an account — it starts pre-loaded with Flopsy’s discharge meds.’}
          </p>
          <form className="stack-md" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="field">
              <span className="field__label">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === ‘login’ ? ‘current-password’ : ‘new-password’} />
              {mode === ‘register’ && <span className="field__hint">At least 6 characters.</span>}
            </label>
            {error && <p className="body-sm error-text">{error}</p>}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              <span className="btn__face">{busy ? ‘One moment…’ : mode === ‘login’ ? ‘Sign in’ : ‘Create account’}</span>
            </button>
          </form>
          <button
            type="button"
            className="link-btn body-sm"
            onClick={() => {
              setMode(mode === ‘login’ ? ‘register’ : ‘login’);
              setError(‘’);
            }}
          >
            {mode === ‘login’ ? "Don’t have an account? Create one" : ‘Already have an account? Sign in’}
          </button>
        </div>
      </div>
    </div>
  );
}
