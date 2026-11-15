import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { InstallButton } from '../lib/install.jsx';

export default function Login() {
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const d = await api('/auth/login', { method: 'POST', body: f });
      localStorage.setItem('kg_token', d.token);
      nav('/admin');
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <div className="login">
      <form className="form card" onSubmit={submit}>
        <img className="logo-img big" src="/logo.png" alt="Khan G" />
        <h2>Admin login</h2>
        <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <InstallButton always className="btn ghost full" label="Install admin app" name="Khan G Admin" />
      </form>
    </div>
  );
}
