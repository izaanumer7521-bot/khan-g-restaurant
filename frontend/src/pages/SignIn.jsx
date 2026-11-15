import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { clearCustomer, saveCustomer, useCustomer } from '../lib/customer.js';
import { useCart } from '../store.jsx';

export default function SignIn() {
  const me = useCustomer();
  const nav = useNavigate();
  const { count } = useCart();
  const [params] = useSearchParams();
  const [f, setF] = useState({ name: '', phone: '' });
  const [state, setState] = useState({ busy: false, err: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, err: '' });
    try {
      const c = await api('/customers/signin', { method: 'POST', body: f });
      saveCustomer(c);
      nav(params.get('next') || (count ? '/checkout' : '/menu'));
    } catch (x) { setState({ busy: false, err: x.message }); }
  };

  if (me) return (
    <div className="sec page narrow center">
      <h1 className="title">Hello, {me.name.split(' ')[0]}</h1>
      <p className="lead">You are signed in with <strong>{me.phone}</strong>. Your details are filled in for you at checkout.</p>
      <div className="btns">
        <Link className="btn" to="/menu">Order now</Link>
        <button className="btn ghost" onClick={clearCustomer}>Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="sec page narrow">
      <h1 className="title">Sign in</h1>
      <p className="muted" style={{ marginBottom: 18 }}>Enter your name and phone number. We will remember them so ordering takes seconds.</p>
      <form className="form card" onSubmit={submit}>
        <label>Your name<input required minLength="2" autoComplete="name" value={f.name} onChange={set('name')} /></label>
        <label>Phone number<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="03XX XXXXXXX" pattern="[0-9+\s\-]{10,16}" title="Enter a valid phone number, e.g. 0309 6313398" value={f.phone} onChange={set('phone')} /></label>
        {state.err && <p className="err">{state.err}</p>}
        <button className="btn full" disabled={state.busy}>{state.busy ? 'Please wait…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
