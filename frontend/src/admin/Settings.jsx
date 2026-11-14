import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
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
