import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Categories() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [edit, setEdit] = useState({}); // id -> new name
  const [msg, setMsg] = useState('');
  const load = () => api('/categories').then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const run = async (fn) => { setMsg(''); try { await fn(); } catch (e) { setMsg(e.message); } await load(); };
  const add = (e) => { e.preventDefault(); run(async () => { await api('/categories', { method: 'POST', body: { name } }); setName(''); }); };
  const rename = (c) => run(async () => { await api('/categories/' + c._id, { method: 'PATCH', body: { name: edit[c._id] } }); setEdit(({ [c._id]: _, ...rest }) => rest); });
  const remove = (c) => { if (window.confirm(`Delete the category "${c.name}"?`)) run(() => api('/categories/' + c._id, { method: 'DELETE' })); };

  return (
    <>
      <div className="bar"><h1>Categories</h1></div>
      <p className="muted">Categories become the filter buttons on your menu page, in the order you add them.</p>
      <form className="cat-add" onSubmit={add}>
        <input required placeholder="New category (e.g. Karahi, BBQ, Drinks)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn sm">Add category</button>
      </form>
      {msg && <p className={'err'}>{msg}</p>}
      {!list.length && <p className="muted">No categories yet. Add your first one above.</p>}
      {list.map((c) => (
        <div className="item" key={c._id}>
          {edit[c._id] !== undefined
            ? <input className="cat-edit" value={edit[c._id]} onChange={(e) => setEdit({ ...edit, [c._id]: e.target.value })} autoFocus />
            : <strong className="grow">{c.name}</strong>}
          <div className="stack" style={{ flexDirection: 'row' }}>
            {edit[c._id] !== undefined
              ? (<><button className="link" onClick={() => rename(c)}>Save</button><button className="link" onClick={() => setEdit(({ [c._id]: _, ...r }) => r)}>Cancel</button></>)
              : (<><button className="link" onClick={() => setEdit({ ...edit, [c._id]: c.name })}>Rename</button><button className="link danger" onClick={() => remove(c)}>Delete</button></>)}
          </div>
        </div>
      ))}
    </>
  );
}
