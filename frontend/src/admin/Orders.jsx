import useList from './useList.js';
import { money } from '../config.js';

const STATUS = ['pending', 'preparing', 'on-the-way', 'completed', 'cancelled'];

export default function Orders() {
  const { data, loading, err, patch, remove, reload } = useList('/orders');
  return (
    <>
      <div className="bar"><h1>Orders</h1><button className="btn ghost sm" onClick={reload}>Refresh</button></div>
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !data.length && <p className="muted">No orders yet.</p>}
      {data.map((o) => (
        <div className="item col" key={o._id}>
          <div className="bar">
            <div>
              <strong>{o.customerName}</strong> <span className={'badge ' + o.type}>{o.type}</span>
              <div className="muted"><a href={'tel:' + o.phone}>{o.phone}</a> · {new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <strong>{money(o.total)}</strong>
          </div>
          {o.type === 'delivery' && <div className="muted">Address: {o.address}</div>}
          <div>{o.items.map((i, k) => <div key={k}>{i.qty}× {i.name}</div>)}</div>
          {o.note && <div className="muted">Note: {o.note}</div>}
          <div className="bar">
            <select value={o.status} onChange={(e) => patch(o._id, { status: e.target.value })}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            <button className="link danger" onClick={() => remove(o._id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
