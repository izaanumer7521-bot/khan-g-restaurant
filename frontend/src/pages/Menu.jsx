import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Dish from '../components/Dish.jsx';
import { api } from '../api.js';

export default function Menu() {
  const [params, setParams] = useSearchParams();
  const [menu, setMenu] = useState([]);
  const [catList, setCatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const cat = params.get('cat') || 'All';

  useEffect(() => {
    Promise.all([api('/menu').then(setMenu), api('/categories').then(setCatList).catch(() => {})])
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Categories in the order set in the admin, then any older ones that only exist on dishes
  const cats = useMemo(() => {
    const used = new Set(menu.map((m) => m.category));
    const ordered = catList.map((c) => c.name).filter((n) => used.has(n));
    const extra = [...used].filter((n) => !catList.some((c) => c.name === n));
    return ['All', ...ordered, ...extra];
  }, [menu, catList]);

  const list = menu.filter((m) => (cat === 'All' || m.category === cat) && (m.name + m.description).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="sec page">
      <h1 className="title">Our menu</h1>
      <input className="search" placeholder="Search dishes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes" />
      <div className="tabs">
        {cats.map((c) => (
          <button key={c} className={c === cat ? 'on' : ''} onClick={() => setParams(c === 'All' ? {} : { cat: c })}>{c}</button>
        ))}
      </div>
      {loading && <p className="muted center">Loading menu…</p>}
      {!loading && !list.length && <p className="muted center">No dishes found. Try another category or search.</p>}
      <div className="grid stagger" key={cat + q}>{list.map((m, i) => <Dish key={m._id} item={m} index={i} />)}</div>
    </div>
  );
}
