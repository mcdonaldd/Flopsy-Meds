import { useState } from 'react';
import { AuthProvider, useAuth } from './state/AuthContext';
import { MedsProvider } from './state/MedsContext';
import AuthScreen from './components/AuthScreen';
import Tracker from './components/Tracker';
import Manage from './components/Manage';
import AddMeds from './components/AddMeds';
import EmergencyFooter from './components/EmergencyFooter';

const TABS = [
  { id: 'tracker', label: 'Daily tracker', component: Tracker },
  { id: 'manage', label: 'Manage meds', component: Manage },
  { id: 'add', label: 'Add meds', component: AddMeds },
];

function Shell() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState('tracker');

  if (loading) return null;
  if (!user) return <AuthScreen />;

  const ActiveView = TABS.find((t) => t.id === tab).component;

  return (
    <MedsProvider>
      <div className="app-shell">
        <header className="container app-header">
          <div>
            <p className="eyebrow eyebrow--accent">Recovery tracker</p>
            <h1 className="headline-lg">Flopsy's Meds 🐕</h1>
          </div>
          <div className="app-header__right">
            <nav className="tabs" role="tablist" aria-label="Views">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className="tabs__tab"
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <p className="body-sm app-header__user">
              {user.email} ·{' '}
              <button type="button" className="link-btn" onClick={logout}>
                Sign out
              </button>
            </p>
          </div>
        </header>
        <main className="container app-main">
          <ActiveView />
        </main>
        <EmergencyFooter />
      </div>
    </MedsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
