import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { saveCustomer, useCustomer } from '../lib/customer.js';
import { useCart } from '../store.jsx';

export default function SignIn() {
  const me = useCustomer();
  const nav = useNavigate();
  const { count } = useCart();
  const [params] = useSearchParams();
  const [f, setF] = useState({ name: '', phone: '' });
  const [state, setState] = useState({ busy: false, err: '' });
  const [notice] = useState(() => { try { const n = sessionStorage.getItem('kg_notice') || ''; sessionStorage.removeItem('kg_notice'); return n; } catch { return ''; } });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, err: '' });
    try {
      const c = await api('/customers/signin', { method: 'POST', body: f });
      saveCustomer(c);
      nav(params.get('next') || (count ? '/checkout' : '/profile'));
    } catch (x) { setState({ busy: false, err: x.message }); }
  };

  if (me) return <Navigate to="/profile" replace />;

  return (
    <div className="sec page narrow">
      <h1 className="title">Sign in</h1>
      <p className="muted" style={{ marginBottom: 18 }}>Enter your name and phone number. You will get your own profile where you can track your orders and see your past orders.</p>
      {notice && <p className="err" style={{ marginBottom: 14 }}>{notice}</p>}
      <form className="form card" onSubmit={submit}>
        <label>Your name<input required minLength="2" autoComplete="name" value={f.name} onChange={set('name')} /></label>
        <label>Phone number<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="03XX XXXXXXX" pattern="[0-9+\s\-]{10,16}" title="Enter a valid phone number, e.g. 0309 6313398" value={f.phone} onChange={set('phone')} /></label>
        {state.err && <p className="err">{state.err}</p>}
        <button className="btn full" disabled={state.busy}>{state.busy ? 'Please wait…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
