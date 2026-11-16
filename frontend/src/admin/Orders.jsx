import { useEffect, useMemo, useState } from 'react';
import useList from './useList.js';
import { api } from '../api.js';
import { money } from '../config.js';
import Icon from './icons.jsx';

const STATUS = [['pending', 'Pending'], ['preparing', 'Preparing'], ['on-the-way', 'On the way'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
const ACTIVE = ['pending', 'preparing', 'on-the-way'];
const LABEL = Object.fromEntries(STATUS);
const no = (o) => String(o._id).slice(-5).toUpperCase();
const waLink = (p) => 'https://wa.me/' + (p.startsWith('0') ? '92' + p.slice(1) : p);
const mapLink = (a) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
const ago = (d) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago';
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' });
};
// The one button that moves an order to its next step
const next = (o) => ({
  pending: ['preparing', 'Accept order'],
  preparing: o.type === 'pickup' ? ['completed', 'Mark picked up'] : ['on-the-way', 'Send out for delivery'],
  'on-the-way': ['completed', 'Mark delivered'],
}[o.status]);

function Ticket({ o, onPatch, onRemove, onEdit }) {
  const [more, setMore] = useState(false);
  const step = next(o);
  const items = o.items.reduce((s, i) => s + i.qty, 0);
  return (
    <article className={'ticket s-' + o.status}>
      <header className="tk-head">
        <div><span className="tk-no">#{no(o)}</span><span className="tk-ago">{ago(o.createdAt)}</span></div>
        <span className="tk-state">{LABEL[o.status]}</span>
      </header>
      <div className="tk-tags">
        <span className={'tk-tag ' + o.type}>{o.type === 'pickup' ? 'Pickup' : 'Delivery'}</span>
        <span className={'tk-tag ' + (o.paymentMethod === 'advance' ? 'online' : 'cash')}>{o.paymentMethod === 'advance' ? 'Pays rider online' + (o.paymentType ? ' · ' + o.paymentType : '') : 'Cash'}</span>
      </div>
      <div className="tk-who"><strong>{o.customerName}</strong><a href={'tel:' + o.phone}>{o.phone}</a></div>
      {o.type === 'delivery' && o.address && <a className="tk-addr" href={mapLink(o.address)} target="_blank" rel="noreferrer"><Icon name="pin" />{o.address}</a>}
      <div className="tk-rule" />
      <ul className="tk-lines">{o.items.map((i, k) => <li key={k}><span><b>{i.qty}×</b> {i.name}</span><span>{money(i.price * i.qty)}</span></li>)}</ul>
      {o.note && <p className="tk-note">Note: {o.note}</p>}
      <div className="tk-total">
        <span>{items} item{items === 1 ? '' : 's'}{o.deliveryCharge ? ` · delivery ${money(o.deliveryCharge)}` : ''}</span>
        <strong>{money(o.total)}</strong>
      </div>
      <footer className="tk-actions">
        <a className="ic-btn" href={'tel:' + o.phone} aria-label={'Call ' + o.customerName}><Icon name="phone" /></a>
        <a className="ic-btn" href={waLink(o.phone)} target="_blank" rel="noreferrer" aria-label={'WhatsApp ' + o.customerName}><Icon name="chat" /></a>
        {step
          ? <button className="btn tk-primary" onClick={() => onPatch(o._id, { status: step[0] })}>{step[1]}</button>
          : <span className="tk-done">{o.status === 'completed' ? 'Completed' : 'Cancelled'}</span>}
        <button className="ic-btn" onClick={() => setMore((v) => !v)} aria-expanded={more} aria-label="More actions"><Icon name="more" /></button>
      </footer>
      {more && (
        <div className="tk-more">
          <button className="btn ghost sm" onClick={() => onEdit(o)}>Edit order</button>
          {ACTIVE.includes(o.status) && <button className="btn ghost sm danger" onClick={() => { if (window.confirm(`Cancel order #${no(o)}?`)) onPatch(o._id, { status: 'cancelled' }); }}>Cancel order</button>}
          {!ACTIVE.includes(o.status) && <button className="btn ghost sm" onClick={() => onPatch(o._id, { status: 'pending' })}>Reopen</button>}
          <button className="link danger" onClick={() => onRemove(o._id)}>Delete</button>
        </div>
      )}
    </article>
  );
}

export default function Orders() {
  const { data, loading, err, reload, patch, remove } = useList('/orders');
  const [tab, setTab] = useState('active');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  useEffect(() => { const t = setInterval(reload, 20000); return () => clearInterval(t); }, [reload]);

  const counts = useMemo(() => ({ active: data.filter((o) => ACTIVE.includes(o.status)).length, ...Object.fromEntries(STATUS.map(([s]) => [s, data.filter((o) => o.status === s).length])) }), [data]);
  const tabs = [['active', 'Active'], ...STATUS, ['all', 'All']];
  const list = data.filter((o) => (tab === 'all' || (tab === 'active' ? ACTIVE.includes(o.status) : o.status === tab))
    && (!q || (o.customerName + o.phone + no(o) + (o.address || '')).toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <div className="bar"><h1>Orders</h1><button className="btn ghost sm" onClick={reload}>Refresh</button></div>
      <input className="search" style={{ maxWidth: 'none' }} placeholder="Search name, phone, address or order number" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="otabs" role="tablist">
        {tabs.map(([s, l]) => (
          <button key={s} role="tab" aria-selected={tab === s} className={(tab === s ? 'on' : '') + (s === 'pending' && counts.pending ? ' hot' : '')} onClick={() => setTab(s)}>
            {l}<em>{s === 'all' ? data.length : counts[s]}</em>
          </button>
        ))}
      </div>
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !list.length && <p className="muted empty">{tab === 'active' ? 'No orders waiting. New ones appear here by themselves.' : 'No orders here.'}</p>}

      <div className="tickets">{list.map((o) => <Ticket key={o._id} o={o} onPatch={patch} onRemove={remove} onEdit={setEdit} />)}</div>

      {edit && <EditOrder order={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); window.dispatchEvent(new Event('kg-orders-changed')); }} />}
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
