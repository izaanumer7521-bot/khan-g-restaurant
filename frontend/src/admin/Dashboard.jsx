import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../config.js';
import Icon from './icons.jsx';

const STATUS_COL = { pending: '#e10b17', preparing: '#ff8a4c', 'on-the-way': '#ffd166', completed: '#4cd38a', cancelled: '#7a7a7a' };
const STATUS_LABEL = { pending: 'Pending', preparing: 'Preparing', 'on-the-way': 'On the way', completed: 'Completed', cancelled: 'Cancelled' };

// Smooth little trend line behind each KPI card
function Spark({ data, color = '#ff3b46', id }) {
  const W = 120; const H = 40; const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [(i / Math.max(data.length - 1, 1)) * W, H - 4 - (v / max) * (H - 10)]);
  const line = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={'g' + id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={line + ` L${W} ${H} L0 ${H} Z`} fill={`url(#g${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Donut({ parts, total }) {
  const R = 52; const C = 2 * Math.PI * R; let off = 0;
  return (
    <svg className="donut" viewBox="0 0 140 140" role="img" aria-label="Orders by status">
      <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="16" />
      {total > 0 && parts.map((p) => {
        const len = (p.n / total) * C; const el = <circle key={p.k} cx="70" cy="70" r={R} fill="none" stroke={p.c} strokeWidth="16" strokeDasharray={`${Math.max(len - 2, 0)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />;
        off += len; return el;
      })}
      <text x="70" y="72" textAnchor="middle" fontSize="30">{total}</text>
      <text x="70" y="92" textAnchor="middle" fontSize="11" style={{ fill: 'rgba(255,255,255,.6)', fontFamily: 'var(--body)' }}>orders</text>
    </svg>
  );
}

const Rank = ({ rows, empty }) => {
  const max = Math.max(...rows.map((r) => r.v), 1);
  if (!rows.length) return <p className="muted">{empty}</p>;
  return <div className="rank">{rows.map((r) => (
    <div key={r.k}><div className="rank-t"><span>{r.k}</span><span>{r.right}</span></div><div className="track"><i style={{ width: Math.max((r.v / max) * 100, 3) + '%', ...(r.c ? { background: r.c } : {}) }} /></div></div>
  ))}</div>;
};

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const load = () => api('/stats').then(setS).catch((e) => setErr(e.message));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  if (err) return <p className="err">{err}</p>;
  if (!s) return <p className="muted">Loading…</p>;

  const ser = s.series || [];
  const last7 = ser.slice(-7);
  const maxBar = Math.max(...last7.map((d) => d.orders), 1);
  const today = ser[ser.length - 1] || { orders: 0, revenue: 0 };
  const week = last7.reduce((a, d) => a + d.orders, 0);
  const statusParts = Object.keys(STATUS_COL).map((k) => ({ k, n: s.byStatus?.[k] || 0, c: STATUS_COL[k] })).filter((p) => p.n > 0);
  const cards = [
    { l: 'Completed sales', v: money(s.revenue), sub: 'Last 14 days', d: ser.map((x) => x.revenue), ic: 'money', to: '/admin/orders', c: '#ff3b46' },
    { l: 'Total orders', v: s.orders, sub: `${week} in the last 7 days`, d: ser.map((x) => x.orders), ic: 'bag', to: '/admin/orders', c: '#ffffff' },
    { l: 'Customers', v: s.customers ?? 0, sub: 'New sign-ups, 14 days', d: ser.map((x) => x.customers), ic: 'customers', to: '/admin/customers', c: '#4cd38a' },
    { l: 'Orders today', v: today.orders, sub: `${money(today.revenue)} completed today`, d: ser.map((x) => x.orders), ic: 'bell', to: '/admin/orders', c: '#ffd166' },
  ];

  return (
    <>
      <div className="dash-head">
        <div><h1>Dashboard</h1><p>Your restaurant at a glance. Updates by itself.</p></div>
        <Link to="/admin/orders" className="btn sm">View orders</Link>
      </div>

      <Link to="/admin/orders" className={'dash-hero' + (s.pendingOrders ? ' hot' : '')}>
        <span className="dh-n">{s.pendingOrders}</span>
        <span className="dh-t"><b>{s.pendingOrders ? (s.pendingOrders === 1 ? 'New order is waiting' : 'New orders are waiting') : 'All caught up'}</b><small>{s.pendingOrders ? 'Tap to accept' : 'New orders show up here and ring this phone'}</small></span>
      </Link>

      <div className="kpis">
        {cards.map((c, i) => (
          <Link to={c.to} key={c.l} className="gcard kpi">
            <div className="kpi-top"><span className="kpi-ic"><Icon name={c.ic} /></span>{c.l}</div>
            <b>{c.v}</b>
            <small>{c.sub}</small>
            <Spark data={c.d} color={c.c} id={i} />
          </Link>
        ))}
      </div>

      <div className="quick">
        <Link to="/admin/messages" className={s.unreadMessages ? 'hot' : ''}><span>Unread messages</span><b>{s.unreadMessages}</b></Link>
        <Link to="/admin/menu"><span>Dishes on menu</span><b>{s.dishes}</b></Link>
        <Link to="/admin/customers"><span>Blocked customers</span><b>{s.blocked ?? 0}</b></Link>
      </div>

      <div className="dash-grid">
        <div className="gcard">
          <div className="gcard-h">
            <div><h3>Orders this week</h3><div className="sub">Placed vs completed, last 7 days</div></div>
            <div className="legend"><span><i style={{ background: '#e10b17' }} />Placed</span><span><i style={{ background: '#d8d8d8' }} />Completed</span></div>
          </div>
          <div className="bars">
            {last7.map((d, i) => (
              <div className={'col' + (i === last7.length - 1 ? ' today' : '')} key={d.date} title={`${d.date}: ${d.orders} placed, ${d.done} completed`}>
                <div className="pair">
                  <div className="b a" style={{ height: (d.orders / maxBar) * 100 + '%' }} />
                  <div className="b c" style={{ height: (d.done / maxBar) * 100 + '%' }} />
                </div>
                <em>{d.label}</em>
              </div>
            ))}
          </div>
        </div>

        <div className="gcard">
          <h3>Orders by status</h3><div className="sub">All time</div>
          <div className="donut-wrap">
            <Donut parts={statusParts} total={s.orders} />
            <div className="dleg">
              {Object.keys(STATUS_COL).map((k) => <div key={k}><i style={{ background: STATUS_COL[k] }} /><span>{STATUS_LABEL[k]}</span><b>{s.byStatus?.[k] || 0}</b></div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid two">
        <div className="gcard">
          <h3>Top dishes</h3><div className="sub">Most ordered, by quantity</div>
          <Rank rows={(s.top || []).map((t) => ({ k: t.name, v: t.qty, right: `${t.qty} · ${money(t.amount)}` }))} empty="No orders yet." />
        </div>
        <div className="gcard">
          <h3>How orders come in</h3><div className="sub">Order type and payment</div>
          <Rank rows={[
            { k: 'Delivery', v: s.mix?.delivery || 0, right: s.mix?.delivery || 0 },
            { k: 'Pickup', v: s.mix?.pickup || 0, right: s.mix?.pickup || 0, c: 'linear-gradient(90deg,#8f8f8f,#fff)' },
            { k: 'Cash', v: s.mix?.cod || 0, right: s.mix?.cod || 0, c: 'linear-gradient(90deg,#1f9d63,#4cd38a)' },
            { k: 'Pay rider online (advance)', v: s.mix?.advance || 0, right: s.mix?.advance || 0, c: 'linear-gradient(90deg,#c98a00,#ffd166)' },
          ]} empty="" />
        </div>
      </div>

      <div className="gcard" style={{ marginTop: 14 }}>
        <div className="gcard-h"><div><h3>Latest orders</h3><div className="sub">The five newest</div></div><Link to="/admin/orders" className="link">See all</Link></div>
        {!s.recent.length && <p className="muted">No orders yet. They will show up here as soon as customers order.</p>}
        {s.recent.map((o) => (
          <div className="item" key={o._id}>
            <div className="grow"><strong>{o.customerName}</strong><div className="muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</div></div>
            <div className="right"><strong>{money(o.total)}</strong><span className={'badge ' + o.status}>{o.status}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}
