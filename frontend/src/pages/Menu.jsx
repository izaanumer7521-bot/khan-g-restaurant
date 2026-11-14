import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Dish from '../components/Dish.jsx';
import { api } from '../api.js';

export default function Menu() {
  const [params, setParams] = useSearchParams();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const cat = params.get('cat') || 'All';

  useEffect(() => { api('/menu').then(setMenu).catch(() => {}).finally(() => setLoading(false)); }, []);

  const cats = useMemo(() => {
    const set = [...new Set(menu.map((m) => m.category))];
    set.sort((a, b) => (a === 'Breakfast' ? -1 : b === 'Breakfast' ? 1 : 0));
    return ['All', ...set];
  }, [menu]);

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
      <div className="grid">{list.map((m) => <Dish key={m._id} item={m} />)}</div>
    </div>
  );
}
