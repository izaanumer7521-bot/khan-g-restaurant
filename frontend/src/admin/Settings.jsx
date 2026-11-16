import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { InstallButton, useInstall } from '../lib/install.jsx';
import AlertToggle from './AlertToggle.jsx';

function AppCard({ onLogout }) {
  const { installed, canPrompt } = useInstall();
  return (
    <div className="gcard">
      <h3>Install the admin app</h3>
      <div className="sub">Put this panel on your phone or computer like a normal app. Works on Android, iPhone, Windows and Mac.</div>
      {installed
        ? <p className="okmsg"><strong>✓ Khan G Admin is installed and you are using it.</strong></p>
        : (
          <>
            <InstallButton always className="btn" label="Install admin app" name="Khan G Admin" />
            <p className="muted" style={{ marginTop: 10, fontSize: '.85rem' }}>{canPrompt ? 'Tap the button and confirm.' : 'If nothing pops up, the button shows the steps for your device.'}</p>
          </>
        )}
      <div className="btns-row" style={{ marginTop: 16 }}>
        <button className="btn ghost sm" onClick={onLogout}>Log out of this device</button>
        <Link to="/admin/devices" className="link">See all logged-in devices</Link>
      </div>
    </div>
  );
}

function Security() {
  const [me, setMe] = useState(null);
  const [f, setF] = useState({ currentPassword: '', newEmail: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/auth/me').then((u) => { setMe(u); setF((x) => ({ ...x, newEmail: u.email })); }); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (f.newPassword && f.newPassword !== f.confirm) return setMsg({ ok: false, text: 'The two new passwords do not match' });
    setBusy(true); setMsg({ ok: false, text: '' });
    try {
      const r = await api('/auth/account', { method: 'PATCH', body: { currentPassword: f.currentPassword, newEmail: f.newEmail, newPassword: f.newPassword } });
      setMe({ ...me, email: r.user.email });
      setF({ currentPassword: '', newEmail: r.user.email, newPassword: '', confirm: '' });
      setMsg({ ok: true, text: 'Saved. Use the new details next time you sign in.' });
    } catch (x) { setMsg({ ok: false, text: x.message }); }
    setBusy(false);
  };

  return (
    <div className="gcard" style={{ maxWidth: 560 }}>
      <h3>Email and password</h3>
      <div className="sub">Change the details you use to sign in to this panel.</div>
      <form className="form" onSubmit={save}>
        <label>Email<input type="email" required value={f.newEmail} onChange={set('newEmail')} /></label>
        <label>New password (leave empty to keep the current one)<input type="password" minLength="8" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></label>
        <label>Current password (required to save)<input type="password" required autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} /></label>
        {msg.text && <p className={msg.ok ? 'okmsg' : 'err'}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}

export default function Settings() {
  const nav = useNavigate();
  const [tab, setTab] = useState('alerts');
  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    localStorage.removeItem('kg_token'); nav('/admin/login');
  };
  return (
    <div className="acct">
      <h1>Account</h1>
      <div className="atabs" role="tablist">
        <button role="tab" aria-selected={tab === 'alerts'} className={tab === 'alerts' ? 'on' : ''} onClick={() => setTab('alerts')}>🔔 Notifications</button>
        <button role="tab" aria-selected={tab === 'security'} className={tab === 'security' ? 'on' : ''} onClick={() => setTab('security')}>🔒 Security</button>
        <button role="tab" aria-selected={tab === 'app'} className={tab === 'app' ? 'on' : ''} onClick={() => setTab('app')}>📲 App</button>
      </div>
      {tab === 'alerts' && <AlertToggle card />}
      {tab === 'security' && <Security />}
      {tab === 'app' && <AppCard onLogout={logout} />}
    </div>
  );
}
