import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store.jsx';
import { api } from '../api.js';
import { money } from '../config.js';

export default function Checkout() {
  const { items, total, clear, setQty } = useCart();
  const [f, setF] = useState({ customerName: '', phone: '', address: '', type: 'delivery', note: '' });
  const [state, setState] = useState({ busy: false, done: null, err: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: null, err: '' });
    try {
      const r = await api('/orders', { method: 'POST', body: { ...f, items: items.map((i) => ({ id: i._id, qty: i.qty })) } });
      clear();
      setState({ busy: false, done: r, err: '' });
    } catch (x) { setState({ busy: false, done: null, err: x.message }); }
  };

  if (state.done) return (
    <div className="sec page narrow center">
      <h1 className="title">Order placed</h1>
      <p className="lead">Thank you, {f.customerName}. Your total is {money(state.done.total)} (pay by cash on {f.type === 'pickup' ? 'pickup' : 'delivery'}). We will call you shortly to confirm.</p>
      <Link to="/menu" className="btn ghost">Back to menu</Link>
    </div>
  );

  if (!items.length) return (
    <div className="sec page narrow center">
      <h1 className="title">Your cart is empty</h1>
      <Link to="/menu" className="btn">Browse the menu</Link>
    </div>
  );

  return (
    <div className="sec page">
      <h1 className="title">Checkout</h1>
      <div className="split">
        <form className="form" onSubmit={submit}>
          <div className="seg">
            <button type="button" className={f.type === 'delivery' ? 'on' : ''} onClick={() => setF({ ...f, type: 'delivery' })}>Delivery</button>
            <button type="button" className={f.type === 'pickup' ? 'on' : ''} onClick={() => setF({ ...f, type: 'pickup' })}>Pickup</button>
          </div>
          <label>Your name<input required value={f.customerName} onChange={set('customerName')} /></label>
          <label>Phone number<input required type="tel" value={f.phone} onChange={set('phone')} /></label>
          {f.type === 'delivery' && <label>Delivery address<textarea required rows="2" value={f.address} onChange={set('address')} /></label>}
          <label>Note for the kitchen (optional)<textarea rows="2" value={f.note} onChange={set('note')} /></label>
          {state.err && <p className="err">{state.err}</p>}
          <button className="btn full" disabled={state.busy}>{state.busy ? 'Placing order…' : 'Place order · ' + money(total)}</button>
          <p className="muted">Payment is in cash when you receive your order.</p>
        </form>
        <div className="card">
          <h3>Order summary</h3>
          {items.map((i) => (
            <div className="cart-row" key={i._id}>
              <div><strong>{i.name}</strong><div className="muted">{money(i.price)} each</div></div>
              <div className="qty">
                <button type="button" onClick={() => setQty(i._id, i.qty - 1)} aria-label="Remove one">−</button>
                <span>{i.qty}</span>
                <button type="button" onClick={() => setQty(i._id, i.qty + 1)} aria-label="Add one">+</button>
              </div>
            </div>
          ))}
          <div className="row total"><span>Total</span><strong>{money(total)}</strong></div>
        </div>
      </div>
    </div>
  );
}
