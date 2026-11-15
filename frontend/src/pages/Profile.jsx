import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { money, payLabel } from '../config.js';
import { clearCustomer, saveCustomer, useCustomer } from '../lib/customer.js';

const ACTIVE = ['pending', 'preparing', 'on-the-way'];
const LABEL = { pending: 'Order received', preparing: 'Being prepared', 'on-the-way': 'On the way', completed: 'Completed', cancelled: 'Cancelled' };
const when = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// delivery: received > preparing > on the way > delivered. pickup: received > preparing > ready > collected.
function Tracker({ o }) {
  const pick = o.type === 'pickup';
  const steps = [
    ['Received', '1'], ['Preparing', '2'], [pick ? 'Ready for pickup' : 'On the way', '3'], [pick ? 'Collected' : 'Delivered', '✓'],
  ];
  const at = { pending: 0, preparing: 1, 'on-the-way': 2, completed: 3 }[o.status] ?? 0;
  return (
    <div className="tsteps" aria-label={'Order status: ' + LABEL[o.status]}>
      <div className="tline"><b style={{ width: (at / 3) * 100 + '%' }} /></div>
      {steps.map(([t, n], i) => (
        <div key={t} className={'tstep' + (i < at || (o.status === 'completed' && i === at) ? ' done' : i === at ? ' now' : '')}>
          <i>{i < at || o.status === 'completed' ? '✓' : n}</i>{t}
        </div>
      ))}
    </div>
  );
}

function PayLine({ o }) {
  if (o.paymentMethod === 'advance') return <span className="pay-line">💳 Pay the rider online · {payLabel(o.paymentType)}</span>;
  return <span className="pay-line">💵 {o.type === 'pickup' ? 'Cash at pickup' : 'Cash on delivery'}</span>;
}

function OrderCard({ o, live }) {
  return (
    <div className={'ocard' + (live ? ' live' : '')}>
      <div className="ocard-h">
        <div>
          <h3>Order #{o.no}</h3>
          <div className="muted" style={{ fontSize: '.85rem' }}>{when(o.createdAt)} · {o.type === 'pickup' ? 'Pickup' : 'Delivery'}</div>
        </div>
        <span className={'ostatus ' + o.status}>{LABEL[o.status] || o.status}</span>
      </div>

      {live && <Tracker o={o} />}
      {live && o.paymentMethod === 'advance' && o.status !== 'completed' && (
        <div className="tnote">When your order arrives, <b>pay the rider online</b> using {payLabel(o.paymentType)}. Please keep your phone ready.</div>
      )}
      {o.status === 'cancelled' && <div className="tnote">This order was cancelled. Call us if you have any question.</div>}

      <div className="olines">
        {o.items.map((i, k) => <div key={k}><span>{i.qty}× {i.name}</span><span>{money(i.price * i.qty)}</span></div>)}
        {o.deliveryCharge > 0 && <div className="muted"><span>Delivery charge</span><span>{money(o.deliveryCharge)}</span></div>}
        <div style={{ paddingTop: 6, fontWeight: 800 }}><span>Total</span><span>{money(o.total)}</span></div>
      </div>
      <PayLine o={o} />
      {o.type === 'delivery' && o.address && <div className="muted" style={{ fontSize: '.85rem', marginTop: 4 }}>📍 {o.address}</div>}
    </div>
  );
}

export default function Profile() {
  const me = useCustomer();
  const [tab, setTab] = useState('track');
  const [orders, setOrders] = useState(null);
  const [prof, setProf] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api('/customers/me/orders').then((d) => { setOrders(d); setErr(''); }).catch((e) => { if (!e.code) setErr(e.message); });
    api('/customers/me').then(setProf).catch(() => {});
  }, []);
  useEffect(() => {
    if (!me) return undefined;
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000); // live tracking
    return () => clearInterval(t);
  }, [me, load]);

  const active = useMemo(() => (orders || []).filter((o) => ACTIVE.includes(o.status)), [orders]);
  const past = useMemo(() => (orders || []).filter((o) => !ACTIVE.includes(o.status)), [orders]);

  if (!me) return <Navigate to="/signin?next=/profile" replace />;

  const logout = async () => {
    try { await api('/customers/logout', { method: 'POST' }); } catch { /* the device is removed either way */ }
    clearCustomer();
  };

  return (
    <div className="sec page narrow">
      <div className="profile-hero">
        <div className="avatar">{(me.name || '?').trim()[0].toUpperCase()}</div>
        <div>
          <h1>{me.name}</h1>
          <div className="muted">📞 {me.phone}</div>
        </div>
      </div>

      <div className="pstats">
        <div><b>{orders ? orders.length : '–'}</b><span>Total orders</span></div>
        <div><b>{orders ? active.length : '–'}</b><span>Active now</span></div>
        <div><b>{prof ? money(prof.spent) : '–'}</b><span>Completed spend</span></div>
      </div>

      <div className="ptabs" role="tablist">
        <button role="tab" aria-selected={tab === 'track'} className={tab === 'track' ? 'on' : ''} onClick={() => setTab('track')}>Track order{active.length ? ` (${active.length})` : ''}</button>
        <button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Order history</button>
        <button role="tab" aria-selected={tab === 'details'} className={tab === 'details' ? 'on' : ''} onClick={() => setTab('details')}>My details</button>
      </div>

      {err && <p className="err">{err}</p>}
      {!orders && !err && tab !== 'details' && <p className="muted">Loading…</p>}

      {tab === 'track' && orders && (
        active.length
          ? <>{active.map((o) => <OrderCard key={o._id} o={o} live />)}<p className="muted" style={{ fontSize: '.82rem' }}>This page updates by itself every few seconds.</p></>
          : <div className="empty"><p>You have no active order right now.</p><Link to="/menu" className="btn">Order now</Link></div>
      )}

      {tab === 'history' && orders && (
        past.length
          ? past.map((o) => <OrderCard key={o._id} o={o} />)
          : <div className="empty"><p>Your past orders will appear here once an order is completed.</p><Link to="/menu" className="btn ghost">Browse the menu</Link></div>
      )}

      {tab === 'details' && <Details me={me} onLogout={logout} />}
    </div>
  );
}

function Details({ me, onLogout }) {
  const [f, setF] = useState({ name: me.name || '', address: me.address || '' });
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg({ ok: false, text: '' });
    try {
      const c = await api('/customers/me', { method: 'PATCH', body: f });
      saveCustomer({ name: c.name, phone: c.phone, address: c.address });
      setMsg({ ok: true, text: 'Saved. Your details are filled in at checkout.' });
    } catch (x) { setMsg({ ok: false, text: x.message }); }
    setBusy(false);
  };
  return (
    <>
      <form className="form card" onSubmit={save}>
        <label>Your name<input required minLength="2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Phone number<input disabled value={me.phone} /></label>
        <label>Delivery address<textarea rows="3" placeholder="House / street, area, nearby landmark" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
        {msg.text && <p className={msg.ok ? 'okmsg' : 'err'}>{msg.text}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
      </form>
      <button className="btn ghost full" style={{ marginTop: 14 }} onClick={onLogout}>Sign out of this device</button>
    </>
  );
}
