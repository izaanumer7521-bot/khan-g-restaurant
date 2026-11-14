import useList from './useList.js';

export default function Messages() {
  const { data, loading, err, patch, remove } = useList('/messages');
  return (
    <>
      <h1>Messages</h1>
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !data.length && <p className="muted">No messages yet.</p>}
      {data.map((m) => (
        <div className={'item col' + (m.read ? '' : ' unread')} key={m._id}>
          <div className="bar">
            <strong>{m.name}</strong>
            <span className="muted">{new Date(m.createdAt).toLocaleString()}</span>
          </div>
          <div className="muted">{[m.email, m.phone].filter(Boolean).join(' · ')}</div>
          <p>{m.message}</p>
          <div className="bar">
            <button className="link" onClick={() => patch(m._id, { read: !m.read })}>{m.read ? 'Mark as unread' : 'Mark as read'}</button>
            <button className="link danger" onClick={() => remove(m._id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
