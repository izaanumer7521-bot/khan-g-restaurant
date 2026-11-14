import { useState } from 'react';
import useList from './useList.js';
import { api, imgUrl } from '../api.js';
import { money } from '../config.js';

// Shrinks photos in the browser so they stay small and upload fast
const shrink = (file) => new Promise((resolve) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return resolve(file);
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob((b) => resolve(b ? new File([b], 'dish.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.82);
  };
  img.onerror = () => resolve(file);
  img.src = url;
});

const blank = { name: '', description: '', price: '', category: 'Breakfast', available: true, featured: false };

export default function MenuManager() {
  const { data, loading, err, reload, patch, remove } = useList('/menu');
  const [form, setForm] = useState(null); // null = closed
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const cats = [...new Set(data.map((d) => d.category))];

  const open = (item) => { setForm(item ? { ...item } : { ...blank }); setFile(null); setMsg(''); };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const fd = new FormData();
    ['name', 'description', 'price', 'category'].forEach((k) => fd.append(k, form[k] ?? ''));
    fd.append('available', form.available);
    fd.append('featured', form.featured);
    if (file) fd.append('image', await shrink(file));
    try {
      await api(form._id ? `/menu/${form._id}` : '/menu', { method: form._id ? 'PUT' : 'POST', form: fd });
      setForm(null); reload();
    } catch (x) { setMsg(x.message); }
    setBusy(false);
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <div className="bar"><h1>Menu</h1><button className="btn sm" onClick={() => open()}>Add dish</button></div>
      {err && <p className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {data.map((m) => (
        <div className="item" key={m._id}>
          <div className="thumb">{m.image ? <img src={imgUrl(m.image)} alt="" /> : <span>{m.name[0]}</span>}</div>
          <div className="grow">
            <strong>{m.name}</strong>
            <div className="muted">{m.category} · {money(m.price)}</div>
            <div className="chips">
              <button className={'chip' + (m.available ? ' on' : '')} onClick={() => patch(m._id, { available: !m.available })}>{m.available ? 'Available' : 'Sold out'}</button>
              <button className={'chip' + (m.featured ? ' on' : '')} onClick={() => patch(m._id, { featured: !m.featured })}>{m.featured ? 'Featured' : 'Not featured'}</button>
            </div>
          </div>
          <div className="stack">
            <button className="link" onClick={() => open(m)}>Edit</button>
            <button className="link danger" onClick={() => remove(m._id)}>Delete</button>
          </div>
        </div>
      ))}

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="modal form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="drawer-h"><h3>{form._id ? 'Edit dish' : 'Add dish'}</h3><button type="button" className="x" onClick={() => setForm(null)} aria-label="Close">×</button></div>
            <label>Name<input required value={form.name} onChange={set('name')} /></label>
            <div className="two">
              <label>Price (Rs.)<input required type="number" min="0" value={form.price} onChange={set('price')} /></label>
              <label>Category<input required list="cats" value={form.category} onChange={set('category')} /></label>
            </div>
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            <label>Description<textarea rows="2" value={form.description} onChange={set('description')} /></label>
            <label>Photo (JPG, PNG or WEBP)<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></label>
            <div className="checks">
              <label><input type="checkbox" checked={form.available} onChange={set('available')} /> Available</label>
              <label><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Show on home page</label>
            </div>
            {msg && <p className="err">{msg}</p>}
            <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save dish'}</button>
          </form>
        </div>
      )}
    </>
  );
}
