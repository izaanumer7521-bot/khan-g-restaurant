import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Dish from '../components/Dish.jsx';
import { flyToCart } from '../components/fly.js';
import { useCart } from '../store.jsx';
import { api, imgUrl } from '../api.js';
import { money } from '../config.js';

export default function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add } = useCart();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [state, setState] = useState('loading');
  const [sel, setSel] = useState(0);
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const btn = useRef();

  useEffect(() => {
    setState('loading'); setSel(0); setQty(1); setItem(null);
    api('/menu/' + id).then((d) => {
      setItem(d); setState('ok'); document.title = d.name + ' | Khan G';
      api('/menu').then((all) => setRelated(all.filter((m) => m.category === d.category && m._id !== d._id).slice(0, 4))).catch(() => {});
    }).catch(() => setState('missing'));
    return () => { document.title = 'Khan G Restaurant'; };
  }, [id]);

  if (state === 'loading') return <div className="sec page"><p className="muted center">Loading…</p></div>;
  if (state === 'missing') return (
    <div className="sec page center"><h1 className="title">Dish not found</h1><p className="muted">It may have been removed from the menu.</p><Link className="btn" to="/menu">Back to menu</Link></div>
  );

  const sizes = item.sizes || [];
  const size = sizes[Math.min(sel, sizes.length - 1)];
  const price = size ? size.price : item.price;
  const onAdd = () => {
    add(item, size, qty);
    flyToCart(btn.current, item.image ? imgUrl(item.image) : '');
    setDone(true); setTimeout(() => setDone(false), 1100);
  };
  const orderNow = () => { add(item, size, qty); nav('/checkout'); };

  return (
    <div className="sec page">
      <p className="crumbs"><Link to="/menu">Menu</Link> / <Link to={'/menu?cat=' + encodeURIComponent(item.category)}>{item.category}</Link> / {item.name}</p>
      <div className="product">
        <div className="product-img">
          {item.image ? <img src={imgUrl(item.image)} alt={item.name} /> : <span>{item.name[0]}</span>}
          {!item.available && <b className="sold">Sold out</b>}
        </div>
        <div className="product-info">
          <span className="tag">{item.category}</span>
          <h1 className="title">{item.name}</h1>
          <strong key={price + qty} className="product-price price-pop">{money(price * qty)}</strong>
          {qty > 1 && <span className="muted"> ({money(price)} each)</span>}
          {item.description && <p className="lead">{item.description}</p>}

          {sizes.length > 0 && (
            <>
              <h3 className="label">Choose size</h3>
              <div className="sizes big" role="radiogroup" aria-label="Choose size">
                {sizes.map((s, k) => (
                  <button key={s.label} type="button" role="radio" aria-checked={k === sel} className={k === sel ? 'on' : ''} onClick={() => setSel(k)}>
                    {s.label}<small>{money(s.price)}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          <h3 className="label">Quantity</h3>
          <div className="qty">
            <button type="button" aria-label="Less" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" aria-label="More" onClick={() => setQty(Math.min(50, qty + 1))}>+</button>
          </div>

          <div className="product-btns">
            <button className="btn" disabled={!item.available} onClick={orderNow}>Order now</button>
            <button ref={btn} className={'btn ghost' + (done ? ' added' : '')} disabled={!item.available} onClick={onAdd}>{done ? 'Added ✓' : 'Add to cart'}</button>
          </div>
          <p className="hint-sm">Cash on delivery · Delivery or pickup</p>
        </div>
      </div>

      {related.length > 0 && (
        <>
          <h2 className="title" style={{ marginTop: 56 }}>More from {item.category}</h2>
          <div className="grid stagger">{related.map((m, i) => <Dish key={m._id} item={m} index={i} />)}</div>
        </>
      )}
    </div>
  );
}
