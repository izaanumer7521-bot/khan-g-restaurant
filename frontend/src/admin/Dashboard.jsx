import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../config.js';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="err">{err}</p>;
  if (!s) return <p className="muted">Loading…</p>;
  const cards = [
    ['New orders', s.pendingOrders, '/admin/orders'],
    ['Pending table requests', s.pendingReservations, '/admin/reservations'],
    ['Unread messages', s.unreadMessages, '/admin/messages'],
    ['Dishes on menu', s.dishes, '/admin/menu'],
    ['Total orders', s.orders, '/admin/orders'],
    ['Completed sales', money(s.revenue), '/admin/orders'],
  ];
  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">{cards.map(([l, v, to]) => <Link to={to} key={l} className="stat"><b>{v}</b><span>{l}</span></Link>)}</div>
      <h2>Latest orders</h2>
      {!s.recent.length && <p className="muted">No orders yet. They will show up here as soon as customers order.</p>}
      {s.recent.map((o) => (
        <div className="item" key={o._id}>
          <div><strong>{o.customerName}</strong><div className="muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</div></div>
          <div className="right"><strong>{money(o.total)}</strong><span className={'badge ' + o.status}>{o.status}</span></div>
        </div>
      ))}
    </>
  );
}
