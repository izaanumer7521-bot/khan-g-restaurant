import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { InstallButton, useInstall } from '../lib/install.jsx';
import { syncPush, turnOffPush, pushSupported, repairPush, currentEndpoint } from '../lib/push.js';
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
  const [info, setInfo] = useState(null);
  const [mine, setMine] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setInfo(await api('/push/status')); } catch { /* ignore */ }
    try { setMine(await currentEndpoint()); } catch { /* ignore */ }
  };
  useEffect(() => { syncPush(false).then(setSt).catch(() => setSt('off')).finally(load); }, []);

  const run = async (fn) => { setBusy(true); setNote(''); try { await fn(); } catch (e) { setNote(e.message); } setBusy(false); await load(); };
  const on = () => run(async () => { unlockAudio(); chime(); setSt(await syncPush(true)); });
  const fix = () => run(async () => { unlockAudio(); setSt(await repairPush()); setNote('This device was registered again. Now press Send test alert.'); });
  const off = () => run(async () => { await turnOffPush(); setSt('off'); });
  const test = () => run(async () => {
    unlockAudio(); chime();
    const r = await api('/push/test', { method: 'POST' });
    const bad = (r.results || []).filter((x) => !x.ok);
    const parts = [];
    if (r.reason) parts.push('Push: ' + r.reason);
    else if (!r.devices) parts.push('No phone or computer is registered for alerts yet. Press Turn on alerts on each device.');
    else parts.push(`Push sent to ${r.sent} of ${r.devices} device(s).` + (bad.length ? ' Problem: ' + bad.map((x) => x.error).join('; ') : ' Look at your notifications now.'));
    if (r.telegram) parts.push(r.telegram.ok ? 'Telegram message sent.' : 'Telegram: ' + r.telegram.reason);
    setNote(parts.join(' '));
  });

  const me = info && mine ? info.devices.find((d) => d.endpoint === mine) : null;
  const label = { on: 'On for this device', off: 'Off', denied: 'Blocked in your browser settings', unsupported: 'Not supported here (on iPhone, install the app first)', 'server-off': 'Server is missing its push keys', checking: '…' }[st];
  return (
    <div className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
      <h3>Order alerts</h3>
      <p className="muted">A notification with sound on every order, even when this app is closed.</p>
      <ul className="checks-list">
        <li className={info ? (info.serverReady ? 'good' : 'bad') : ''}>Server push keys: <strong>{!info ? '…' : info.serverReady ? 'OK' : 'MISSING'}</strong>
          {info && !info.serverReady && <div className="muted">Add <code>VAPID_PUBLIC_KEY</code> and <code>VAPID_PRIVATE_KEY</code> in Vercel → Settings → Environment Variables, then redeploy. Without them alerts only work while this page is open.</div>}
        </li>
        <li className={st === 'on' ? 'good' : 'bad'}>This device: <strong>{label}</strong></li>
        <li className={me ? (me.lastError ? 'bad' : 'good') : (info ? 'bad' : '')}>Registered on server: <strong>{!info ? '…' : me ? (me.lastError ? 'yes, but last alert failed' : 'yes') : 'NO'}</strong>
          {me && me.lastError && <div className="muted">{me.lastError}. Press “Fix this device”.</div>}
          {info && !me && st === 'on' && <div className="muted">Press “Fix this device”.</div>}
        </li>
        <li className={info && info.telegram ? 'good' : ''}>Telegram backup: <strong>{!info ? '…' : info.telegram ? 'On' : 'Off (optional)'}</strong></li>
        {info && <li>Devices registered: <strong>{info.devices.length}</strong></li>}
      </ul>
      <div className="btns" style={{ justifyContent: 'flex-start' }}>
        {pushSupported() && st !== 'on' && <button className="btn sm" disabled={busy} onClick={on}>Turn on alerts</button>}
        {pushSupported() && st === 'on' && <button className="btn ghost sm" disabled={busy} onClick={fix}>Fix this device</button>}
        <button className="btn sm" disabled={busy} onClick={test}>Send test alert</button>
        {st === 'on' && <button className="btn ghost sm" disabled={busy} onClick={off}>Turn off</button>}
      </div>
      {note && <p className="muted" style={{ marginTop: 10 }}>{note}</p>}
      <details style={{ marginTop: 14 }}>
        <summary className="muted" style={{ cursor: 'pointer' }}>Not getting alerts when the app is closed?</summary>
        <ol className="ios-steps" style={{ fontSize: '.88rem' }}>
          <li>Every line above must say OK / On / yes. Fix the first red one.</li>
          <li><b>Android:</b> Settings → Apps → Chrome (and Khan G Admin) → Battery → <b>Unrestricted</b>, and keep notifications allowed.</li>
          <li><b>iPhone:</b> add the admin app to the Home Screen and open alerts from there (iOS 16.4+).</li>
          <li>Do not “force close” the browser. Just close or swipe away normally.</li>
          <li>A phone that is switched off gets the alert as soon as it is back online (held for 24 hours).</li>
        </ol>
      </details>
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
      <AdminInstall onLogout={async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ } localStorage.removeItem('kg_token'); nav('/admin/login'); }} />
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
