import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

const blank = { name: '', description: '', price: '', category: '', sizes: [], available: true, featured: false };
const priceText = (m) => (m.sizes && m.sizes.length ? m.sizes.map((s) => `${s.label} ${money(s.price)}`).join(' · ') : money(m.price));

export default function MenuManager() {
  const { data, loading, err, reload, patch, remove } = useList('/menu');
  const [form, setForm] = useState(null); // null = closed
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [cats, setCats] = useState([]);
  useEffect(() => { api('/categories').then(setCats).catch(() => {}); }, []);
  const catNames = cats.map((c) => c.name);
  const multi = form && form.sizes && form.sizes.length > 0;

  const open = (item) => {
    setForm(item ? { ...item, sizes: (item.sizes || []).map((x) => ({ ...x })) } : { ...blank, category: catNames[0] || '' });
    setFile(null); setMsg('');
  };
  const setSize = (i, k, v) => setForm({ ...form, sizes: form.sizes.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  const addSize = (label = '') => setForm({ ...form, sizes: [...form.sizes, { label, price: '' }] });
  const toggleMulti = (on) => setForm({ ...form, sizes: on ? [{ label: 'Half', price: form.price || '' }, { label: 'Full', price: '' }] : [] });
  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!form.category) return setMsg('Choose a category first (add one under Categories).');
    if (multi && form.sizes.some((x) => !String(x.label).trim() || x.price === '' || Number(x.price) < 0)) return setMsg('Give every size a name and a price.');
    setBusy(true);
    const fd = new FormData();
    ['name', 'description', 'price', 'category'].forEach((k) => fd.append(k, form[k] ?? ''));
    fd.append('sizes', JSON.stringify(multi ? form.sizes : []));
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
            <div className="muted">{m.category} · {priceText(m)}</div>
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
            <label>Category
              <select required value={form.category} onChange={set('category')}>
                {!catNames.includes(form.category) && <option value={form.category}>{form.category || 'Choose a category'}</option>}
                {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {!catNames.length && <span className="hint-sm">No categories yet. <Link to="/admin/categories" className="link">Add one first</Link>.</span>}
            </label>
            <label className="checks"><span><input type="checkbox" checked={multi} onChange={(e) => toggleMulti(e.target.checked)} /> This dish has more than one size or price (Half / Full, Small / Large…)</span></label>
            {!multi && <label>Price (Rs.)<input required type="number" min="0" value={form.price} onChange={set('price')} /></label>}
            {multi && (
              <div className="form">
                {form.sizes.map((x, i) => (
                  <div className="size-row" key={i}>
                    <input required placeholder="Size name (e.g. Half)" value={x.label} onChange={(e) => setSize(i, 'label', e.target.value)} />
                    <input required type="number" min="0" placeholder="Price (Rs.)" value={x.price} onChange={(e) => setSize(i, 'price', e.target.value)} />
                    <button type="button" className="link danger" disabled={form.sizes.length < 2} onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, j) => j !== i) })}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn ghost sm" onClick={() => addSize()}>+ Add another size</button>
              </div>
            )}
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
