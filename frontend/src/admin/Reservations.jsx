import useList from './useList.js';

export default function Reservations() {
  const { data, loading, err, patch, remove, reload } = useList('/reservations');
  return (
    <>
      <div className="bar"><h1>Table requests</h1><button className="btn ghost sm" onClick={reload}>Refresh</button></div>
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !data.length && <p className="muted">No table requests yet.</p>}
      {data.map((r) => (
        <div className="item col" key={r._id}>
          <div className="bar">
            <div>
              <strong>{r.name}</strong> · {r.guests} guests
              <div className="muted"><a href={'tel:' + r.phone}>{r.phone}</a></div>
            </div>
            <div className="right"><strong>{r.date}</strong><div className="muted">{r.time}</div></div>
          </div>
          {r.note && <div className="muted">Note: {r.note}</div>}
          <div className="bar">
            <select value={r.status} onChange={(e) => patch(r._id, { status: e.target.value })}>
              {['pending', 'confirmed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="link danger" onClick={() => remove(r._id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
