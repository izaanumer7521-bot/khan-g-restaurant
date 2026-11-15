import { useState } from 'react';
import useList from './useList.js';
import { money } from '../config.js';

export default function Customers() {
  const { data, loading, err, remove } = useList('/customers');
  const [q, setQ] = useState('');
  const list = data.filter((c) => (c.name + c.phone).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="bar"><h1>Customers</h1><span className="muted">{data.length} saved</span></div>
      <p className="muted">People who signed in or placed an order. Their name and phone are saved here automatically.</p>
      <input className="search" style={{ maxWidth: 'none' }} placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !list.length && <p className="muted">No customers yet.</p>}
      {list.map((c) => (
        <div className="item" key={c._id}>
          <div className="grow">
            <strong>{c.name}</strong>
            <div><a href={'tel:' + c.phone}>📞 {c.phone}</a></div>
            {c.address && <div className="muted">📍 {c.address}</div>}
            <div className="muted">Joined {new Date(c.createdAt).toLocaleDateString()} · {c.orders} order{c.orders === 1 ? '' : 's'}{c.spent ? ` · ${money(c.spent)} completed` : ''}</div>
          </div>
          <button className="link danger" onClick={() => remove(c._id)}>Delete</button>
        </div>
      ))}
    </>
  );
}
