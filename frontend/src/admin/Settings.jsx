import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { InstallButton, useInstall } from '../lib/install.jsx';
import { syncPush, turnOffPush, pushSupported } from '../lib/push.js';
import { chime, unlockAudio } from '../lib/sound.js';

function AdminInstall({ onLogout }) {
  const { installed, canPrompt } = useInstall();
  return (
    <div className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
      <h3>Install the admin app</h3>
      <p className="muted">Put this panel on your phone or computer like a normal app, separate from the website. Works on Android, iPhone, Windows and Mac.</p>
      {installed
        ? <p className="ok"><strong>✓ Khan G Admin is installed and you are using it.</strong></p>
        : (
          <>
            <InstallButton always className="btn" label="Install admin app" name="Khan G Admin" />
            <p className="muted" style={{ marginTop: 10, fontSize: '.85rem' }}>{canPrompt ? 'Tap the button and confirm.' : 'If nothing pops up, the button shows the steps for your device.'}</p>
          </>
        )}
      <button className="btn ghost sm" style={{ marginTop: 14 }} onClick={onLogout}>Log out</button>
    </div>
  );
}

function Alerts() {
  const [st, setSt] = useState('checking');
  const [note, setNote] = useState('');
  useEffect(() => { syncPush(false).then(setSt).catch(() => setSt('off')); }, []);
  const on = async () => { unlockAudio(); chime(); try { setSt(await syncPush(true)); } catch (e) { setNote(e.message); } };
  const off = async () => { await turnOffPush(); setSt('off'); };
  const test = async () => {
    unlockAudio(); chime(); setNote('');
    try { const r = await api('/push/test', { method: 'POST' }); setNote(r.devices ? `Test alert sent to ${r.sent} of ${r.devices} device(s).` : 'No device has alerts turned on yet.'); }
    catch (e) { setNote(e.message); }
  };
  const label = { on: 'On for this device', off: 'Off', denied: 'Blocked in your browser settings', unsupported: 'Not supported here (on iPhone, install the app first)', 'server-off': 'Server is missing its VAPID keys', checking: '…' }[st];
  return (
    <div className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
      <h3>Order alerts</h3>
      <p className="muted">Get a notification with sound on this phone or laptop every time a customer places an order.</p>
      <p>Status: <strong className={st === 'on' ? 'ok' : ''}>{label}</strong></p>
      <div className="btns" style={{ justifyContent: 'flex-start' }}>
        {pushSupported() && st !== 'on' && <button className="btn sm" onClick={on}>Turn on alerts</button>}
        {st === 'on' && <button className="btn sm" onClick={test}>Send test alert</button>}
        {st === 'on' && <button className="btn ghost sm" onClick={off}>Turn off</button>}
      </div>
      {note && <p className="muted" style={{ marginTop: 10 }}>{note}</p>}
    </div>
  );
}

export default function Settings() {
  const nav = useNavigate();
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
    <>
      <h1>Account</h1>
      <Alerts />
      <AdminInstall onLogout={() => { localStorage.removeItem('kg_token'); nav('/admin/login'); }} />
      <h2>Admin email and password</h2>
      <p className="muted">Change the email and password you use to sign in to this panel.</p>
      <form className="form card" style={{ maxWidth: 480 }} onSubmit={save}>
        <label>Email<input type="email" required value={f.newEmail} onChange={set('newEmail')} /></label>
        <label>New password (leave empty to keep the current one)<input type="password" minLength="8" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></label>
        <label>Current password (required to save)<input type="password" required autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} /></label>
        {msg.text && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </>
  );
}
