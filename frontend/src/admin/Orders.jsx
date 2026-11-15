import { useEffect, useMemo, useState } from 'react';
import useList from './useList.js';
import { api } from '../api.js';
import { money } from '../config.js';

const STATUS = [['pending', 'Pending'], ['preparing', 'Preparing'], ['on-the-way', 'On the way'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
const no = (o) => String(o._id).slice(-5).toUpperCase();
const waLink = (p) => 'https://wa.me/' + (p.startsWith('0') ? '92' + p.slice(1) : p);

export default function Orders() {
  const { data, loading, err, reload, patch, remove } = useList('/orders');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  useEffect(() => { const t = setInterval(reload, 20000); return () => clearInterval(t); }, [reload]);

  const counts = useMemo(() => Object.fromEntries(STATUS.map(([s]) => [s, data.filter((o) => o.status === s).length])), [data]);
  const list = data.filter((o) => (tab === 'all' || o.status === tab)
    && (!q || (o.customerName + o.phone + no(o) + (o.address || '')).toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <div className="bar"><h1>Orders</h1><button className="btn ghost sm" onClick={reload}>Refresh</button></div>
      <input className="search" style={{ maxWidth: 'none' }} placeholder="Search by name, phone, address or order number" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="tabs" style={{ position: 'static', background: 'none', paddingBottom: 14 }}>
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All ({data.length})</button>
        {STATUS.map(([s, l]) => <button key={s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>{l} ({counts[s]})</button>)}
      </div>
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !list.length && <p className="muted">No orders here.</p>}

      {list.map((o) => (
        <div className={'item col order' + (o.status === 'pending' ? ' unread' : '')} key={o._id}>
          <div className="bar">
            <div>
              <strong>#{no(o)} · {o.customerName}</strong> <span className={'badge ' + o.type}>{o.type}</span>
              <div className="muted">{new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <select value={o.status} onChange={(e) => patch(o._id, { status: e.target.value })} aria-label="Order status">
              {STATUS.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
            </select>
          </div>
          <div className="contact-line">
            <a href={'tel:' + o.phone}>📞 {o.phone}</a>
            <a href={waLink(o.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
          {o.type === 'delivery' && <div className="muted">📍 {o.address}</div>}
          <div className="lines">{o.items.map((i, k) => <div key={k}><span>{i.qty}× {i.name}</span><span>{money(i.price * i.qty)}</span></div>)}</div>
          {o.note && <div className="muted">Note: {o.note}</div>}
          <div className="sums">
            <div><span>Items</span><span>{money(o.subtotal ?? o.items.reduce((s, i) => s + i.price * i.qty, 0))}</span></div>
            <div><span>Delivery charge</span><span>{money(o.deliveryCharge || 0)}</span></div>
            <div className="g"><span>Total</span><strong>{money(o.total)}</strong></div>
          </div>
          <div className="bar">
            <button className="btn ghost sm" onClick={() => setEdit(o)}>Edit order</button>
            <button className="link danger" onClick={() => remove(o._id)}>Delete</button>
          </div>
        </div>
      ))}

      {edit && <EditOrder order={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function EditOrder({ order, onClose, onSaved }) {
  const [f, setF] = useState({
    customerName: order.customerName, phone: order.phone, address: order.address || '', type: order.type, note: order.note || '',
    deliveryCharge: order.deliveryCharge || 0, status: order.status,
    items: order.items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
  });
  const [menu, setMenu] = useState([]);
  const [pick, setPick] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/menu').then(setMenu).catch(() => {}); }, []);

  // one option per dish and size
  const options = useMemo(() => menu.flatMap((m) => (m.sizes && m.sizes.length
    ? m.sizes.map((s) => ({ name: `${m.name} (${s.label})`, price: s.price }))
    : [{ name: m.name, price: m.price }])), [menu]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setItem = (i, k, v) => setF({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const add = () => {
    if (pick === '') return;
    const o = options[Number(pick)];
    const at = f.items.findIndex((x) => x.name === o.name);
    setF({ ...f, items: at >= 0 ? f.items.map((x, j) => (j === at ? { ...x, qty: Number(x.qty) + 1 } : x)) : [...f.items, { name: o.name, price: o.price, qty: 1 }] });
    setPick('');
  };
  const subtotal = f.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const total = subtotal + (Number(f.deliveryCharge) || 0);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      await api('/orders/' + order._id, { method: 'PATCH', body: { ...f, deliveryCharge: Number(f.deliveryCharge) || 0, items: f.items.filter((i) => Number(i.qty) > 0) } });
      onSaved();
    } catch (x) { setMsg(x.message); setBusy(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal form wide" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="drawer-h"><h3>Edit order #{no(order)}</h3><button type="button" className="x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="seg">
          <button type="button" className={f.type === 'delivery' ? 'on' : ''} onClick={() => setF({ ...f, type: 'delivery', deliveryCharge: f.deliveryCharge || 100 })}>Delivery</button>
          <button type="button" className={f.type === 'pickup' ? 'on' : ''} onClick={() => setF({ ...f, type: 'pickup', deliveryCharge: 0 })}>Pickup</button>
        </div>
        <label>Customer name<input required value={f.customerName} onChange={set('customerName')} /></label>
        <label>Phone<input required type="tel" value={f.phone} onChange={set('phone')} /></label>
        {f.type === 'delivery' && <label>Delivery address<textarea required rows="2" value={f.address} onChange={set('address')} /></label>}
        <label>Note<textarea rows="2" value={f.note} onChange={set('note')} /></label>

        <strong>Items</strong>
        {f.items.map((i, k) => (
          <div className="edit-line" key={k}>
            <input aria-label="Item name" value={i.name} onChange={(e) => setItem(k, 'name', e.target.value)} />
            <input aria-label="Price" type="number" min="0" value={i.price} onChange={(e) => setItem(k, 'price', e.target.value)} />
            <input aria-label="Quantity" type="number" min="1" value={i.qty} onChange={(e) => setItem(k, 'qty', e.target.value)} />
            <button type="button" className="link danger" disabled={f.items.length < 2} onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== k) })}>✕</button>
          </div>
        ))}
        <div className="edit-add">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Add a dish">
            <option value="">+ Add a dish…</option>
            {options.map((o, k) => <option key={k} value={k}>{o.name} · {money(o.price)}</option>)}
          </select>
          <button type="button" className="btn ghost sm" onClick={add} disabled={pick === ''}>Add</button>
        </div>

        <label>Delivery charge (Rs.)<input type="number" min="0" value={f.deliveryCharge} onChange={set('deliveryCharge')} /></label>
        <div className="sums">
          <div><span>Items</span><span>{money(subtotal)}</span></div>
          <div><span>Delivery charge</span><span>{money(Number(f.deliveryCharge) || 0)}</span></div>
          <div className="g"><span>Total</span><strong>{money(total)}</strong></div>
        </div>
        {msg && <p className="err">{msg}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}
