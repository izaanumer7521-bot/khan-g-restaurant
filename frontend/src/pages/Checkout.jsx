import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store.jsx';
import { api } from '../api.js';
import { money } from '../config.js';
import { getCustomer, saveCustomer, useCustomer } from '../lib/customer.js';

export default function Checkout() {
  const { items, total, clear, setQty } = useCart();
  const me = useCustomer();
  const [f, setF] = useState(() => {
    const c = getCustomer() || {};
    return { customerName: c.name || '', phone: c.phone || '', address: c.address || '', type: 'delivery', note: '' };
  });
  const [charge, setCharge] = useState(100);
  const [state, setState] = useState({ busy: false, done: null, err: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { api('/orders/info').then((i) => setCharge(i.deliveryCharge)).catch(() => {}); }, []);

  const delivery = f.type === 'delivery' ? charge : 0;
  const grand = total + delivery;

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: null, err: '' });
    try {
      const r = await api('/orders', { method: 'POST', body: { ...f, items: items.map((i) => ({ id: i._id, size: i.size, qty: i.qty })) } });
      saveCustomer({ name: f.customerName.trim(), phone: f.phone.trim(), address: f.type === 'delivery' ? f.address.trim() : (getCustomer() || {}).address || '' });
      clear();
      setState({ busy: false, done: r, err: '' });
    } catch (x) { setState({ busy: false, done: null, err: x.message }); }
  };

  if (state.done) return (
    <div className="sec page narrow center">
      <h1 className="title">Order placed</h1>
      <p className="lead">Thank you, {f.customerName}. Your order number is <strong>#{state.done.no}</strong>.</p>
      <div className="card receipt">
        <div className="row"><span>Items</span><span>{money(state.done.subtotal)}</span></div>
        {state.done.deliveryCharge > 0 && <div className="row"><span>Delivery charge</span><span>{money(state.done.deliveryCharge)}</span></div>}
        <div className="row total"><span>Total to pay</span><strong>{money(state.done.total)}</strong></div>
      </div>
      <p className="muted" style={{ margin: '14px 0 22px' }}>Pay in cash on {f.type === 'pickup' ? 'pickup' : 'delivery'}. We will call you shortly to confirm.</p>
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
      {!me && <p className="muted" style={{ marginBottom: 14 }}>Have ordered before? <Link to="/signin?next=/checkout" className="link">Sign in</Link> to fill in your details.</p>}
      <div className="split">
        <form className="form" onSubmit={submit}>
          <div className="seg">
            <button type="button" className={f.type === 'delivery' ? 'on' : ''} onClick={() => setF({ ...f, type: 'delivery' })}>Delivery</button>
            <button type="button" className={f.type === 'pickup' ? 'on' : ''} onClick={() => setF({ ...f, type: 'pickup' })}>Pickup</button>
          </div>
          <label>Your name *<input required minLength="2" autoComplete="name" value={f.customerName} onChange={set('customerName')} /></label>
          <label>Phone number *<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="03XX XXXXXXX" pattern="[0-9+\s\-]{10,16}" title="Enter a valid phone number, e.g. 0309 6313398" value={f.phone} onChange={set('phone')} /></label>
          {f.type === 'delivery' && <label>Delivery address *<textarea required minLength="5" rows="3" autoComplete="street-address" placeholder="House / street, area, nearby landmark" value={f.address} onChange={set('address')} /></label>}
          <label>Note for the kitchen (optional)<textarea rows="2" value={f.note} onChange={set('note')} /></label>
          {state.err && <p className="err">{state.err}</p>}
          <button className="btn full" disabled={state.busy}>{state.busy ? 'Placing order…' : 'Place order · ' + money(grand)}</button>
          <p className="muted">Payment is in cash when you receive your order. Fields marked * are required.</p>
        </form>
        <div className="card">
          <h3>Order summary</h3>
          {items.map((i) => (
            <div className="cart-row" key={i.key}>
              <div><strong>{i.name}{i.size ? ' (' + i.size + ')' : ''}</strong><div className="muted">{money(i.price)} each</div></div>
              <div className="qty">
                <button type="button" onClick={() => setQty(i.key, i.qty - 1)} aria-label="Remove one">−</button>
                <span>{i.qty}</span>
                <button type="button" onClick={() => setQty(i.key, i.qty + 1)} aria-label="Add one">+</button>
              </div>
            </div>
          ))}
          <div className="row" style={{ paddingTop: 14 }}><span>Subtotal</span><span>{money(total)}</span></div>
          <div className="row" style={{ paddingTop: 8 }}><span>Delivery charge</span><span>{f.type === 'delivery' ? money(charge) : 'None (pickup)'}</span></div>
          <div className="row total"><span>Total</span><strong>{money(grand)}</strong></div>
        </div>
      </div>
    </div>
  );
}
