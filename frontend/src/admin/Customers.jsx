import { useState } from 'react';
import { Link } from 'react-router-dom';
import useList from './useList.js';
import { api } from '../api.js';
import { money } from '../config.js';

export default function Customers() {
  const { data, loading, err, reload, remove } = useList('/customers');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [note, setNote] = useState('');
  const blockedCount = data.filter((c) => c.blocked).length;
  const list = data.filter((c) => (tab === 'all' || c.blocked) && (c.name + c.phone).toLowerCase().includes(q.toLowerCase()));

  const act = async (fn) => { setNote(''); try { await fn(); await reload(); } catch (e) { setNote(e.message); } };
  const block = (c) => { if (window.confirm(`Block ${c.name}?\n\nThey will be logged out of every device right away and cannot sign in or place orders until you unblock them.`)) act(() => api(`/customers/${c._id}/block`, { method: 'POST' })); };
  const unblock = (c) => act(() => api(`/customers/${c._id}/unblock`, { method: 'POST' }));

  return (
    <>
      <div className="bar"><h1>Customers</h1><span className="muted">{data.length} saved{blockedCount ? ` · ${blockedCount} blocked` : ''}</span></div>
      <p className="muted" style={{ marginBottom: 12 }}>People who signed in or placed an order. Block anyone you do not want to serve, and unblock them any time. See every signed-in phone in <Link to="/admin/devices" className="link">Devices</Link>.</p>
      <input className="search" style={{ maxWidth: 'none' }} placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="tabs" style={{ position: 'static', background: 'none', paddingBottom: 14 }}>
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All ({data.length})</button>
        <button className={tab === 'blocked' ? 'on' : ''} onClick={() => setTab('blocked')}>Blocked ({blockedCount})</button>
      </div>
      {err && <p className="err">{err}</p>}
      {note && <p className="err">{note}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !list.length && <p className="muted">{tab === 'blocked' ? 'No blocked customers.' : 'No customers yet.'}</p>}
      {list.map((c) => (
        <div className={'item' + (c.blocked ? ' blocked' : '')} key={c._id}>
          <div className="grow">
            <strong>{c.name}</strong>{c.blocked && <span className="tag red">Blocked</span>}
            <div><a href={'tel:' + c.phone}>📞 {c.phone}</a></div>
            {c.address && <div className="muted">📍 {c.address}</div>}
            <div className="muted">Joined {new Date(c.createdAt).toLocaleDateString()} · {c.orders} order{c.orders === 1 ? '' : 's'}{c.spent ? ` · ${money(c.spent)} completed` : ''} · {c.devices} device{c.devices === 1 ? '' : 's'} signed in</div>
          </div>
          <div className="btns-row">
            {c.blocked
              ? <button className="btn sm" onClick={() => unblock(c)}>Unblock</button>
              : <button className="btn ghost sm danger" onClick={() => block(c)}>Block</button>}
            <button className="link danger" onClick={() => remove(c._id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
