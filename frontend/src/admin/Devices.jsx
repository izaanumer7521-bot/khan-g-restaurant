import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago';
  return Math.round(m / 1440) + ' d ago';
};
const icon = (d) => (/iPhone|Android|iPad/.test(d) ? '📱' : '💻');

export default function Devices() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [tab, setTab] = useState('customer');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/sessions').then((d) => { setList(d); setErr(''); }).catch((e) => setErr(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const run = async (fn) => { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  const removeOne = (s) => {
    const self = s.current ? '\n\nThis is the device you are using right now, so you will be logged out too.' : '';
    if (!window.confirm(`Log out ${s.who} on ${s.device}?\n\nThat device is signed out automatically within a few seconds.${s.kind === 'admin' ? '\n\nOrder alerts on it stay on. To stop them, unregister it in Account > Notifications.' : ''}${self}`)) return;
    run(async () => {
      await api('/sessions/' + s._id, { method: 'DELETE' });
      if (s.current) { localStorage.removeItem('kg_token'); nav('/admin/login'); }
    });
  };
  const removeAll = (s) => { if (window.confirm(`Log ${s.who} out of ALL their devices?`)) run(() => api('/sessions?customer=' + s.customerId, { method: 'DELETE' })); };
  const block = (s) => { if (window.confirm(`Block ${s.who}?\n\nThey are logged out of every device right away and cannot sign in or order until you unblock them.`)) run(() => api(`/customers/${s.customerId}/block`, { method: 'POST' })); };
  const unblock = (s) => run(() => api(`/customers/${s.customerId}/unblock`, { method: 'POST' }));

  const customers = list.filter((s) => s.kind === 'customer');
  const admins = list.filter((s) => s.kind === 'admin');
  const shown = tab === 'customer' ? customers : admins;

  return (
    <>
      <div className="bar"><h1>Devices</h1><button className="btn ghost sm" onClick={load}>Refresh</button></div>
      <p className="muted" style={{ marginBottom: 12 }}>Every phone and computer that is signed in right now. Remove a device and it is logged out automatically. Block a customer to log them out everywhere and stop their orders; you can unblock them later.</p>
      <div className="tabs" style={{ position: 'static', background: 'none', paddingBottom: 14 }}>
        <button className={tab === 'customer' ? 'on' : ''} onClick={() => setTab('customer')}>Customers ({customers.length})</button>
        <button className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>Admin ({admins.length})</button>
      </div>
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !shown.length && <p className="muted">{tab === 'customer' ? 'No customer is signed in on any device.' : 'No admin devices.'}</p>}

      {shown.map((s) => (
        <div className={'item' + (s.blocked ? ' blocked' : '')} key={s._id}>
          <div className="dev-ic">{icon(s.device)}</div>
          <div className="grow">
            <strong>{s.device}</strong>{s.current && <span className="tag green">This device</span>}{s.blocked && <span className="tag red">Blocked</span>}
            <div>{s.who}{s.phone ? ` · ${s.phone}` : ''}</div>
            <div className="muted">Active {ago(s.lastActiveAt)} · signed in {new Date(s.createdAt).toLocaleDateString()}{s.ip ? ` · IP ${s.ip}` : ''}</div>
          </div>
          <div className="btns-row">
            <button className="btn ghost sm" onClick={() => removeOne(s)}>Log out device</button>
            {s.kind === 'customer' && s.customerId && (
              <>
                <button className="link" onClick={() => removeAll(s)}>All devices</button>
                {s.blocked
                  ? <button className="btn sm" onClick={() => unblock(s)}>Unblock</button>
                  : <button className="btn ghost sm danger" onClick={() => block(s)}>Block</button>}
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
