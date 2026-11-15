import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store.jsx';
import { imgUrl } from '../api.js';
import { money } from '../config.js';
import { flyToCart } from './fly.js';

const isNew = (d) => d.createdAt && Date.now() - new Date(d.createdAt).getTime() < 7 * 864e5;

export default function Dish({ item, index = 0 }) {
  const { add } = useCart();
  const nav = useNavigate();
  const sizes = item.sizes || [];
  const [sel, setSel] = useState(0);
  const [done, setDone] = useState(false);
  const btn = useRef();
  const size = sizes[Math.min(sel, sizes.length - 1)];
  const price = size ? size.price : item.price;
  const to = '/menu/' + item._id;

  const onAdd = () => {
    add(item, size);
    flyToCart(btn.current, item.image ? imgUrl(item.image) : '');
    setDone(true);
    setTimeout(() => setDone(false), 1100);
  };
  const orderNow = () => { add(item, size); nav('/checkout'); };

  return (
    <article className="dish" style={{ '--i': index }}>
      <Link to={to} className="dish-img" aria-label={'View ' + item.name}>
        {item.image ? <img src={imgUrl(item.image)} alt={item.name} loading="lazy" /> : <span>{item.name[0]}</span>}
        {!item.available && <b className="sold">Sold out</b>}
        {item.available && isNew(item) && <b className="new">New</b>}
      </Link>
      <div className="dish-body">
        <h3><Link to={to}>{item.name}</Link></h3>
        {item.description && <p>{item.description}</p>}
        {sizes.length > 0 && (
          <div className="sizes" role="radiogroup" aria-label="Choose size">
            {sizes.map((s, k) => (
              <button key={s.label} type="button" role="radio" aria-checked={k === sel} className={k === sel ? 'on' : ''} onClick={() => setSel(k)}>{s.label}</button>
            ))}
          </div>
        )}
        <div className="dish-foot">
          <strong key={price} className="price-pop">{money(price)}</strong>
          <div className="dish-btns">
            <button ref={btn} className={'btn ghost sm' + (done ? ' added' : '')} disabled={!item.available} onClick={onAdd}>{done ? 'Added ✓' : 'Add to cart'}</button>
            <button className="btn sm" disabled={!item.available} onClick={orderNow}>Order now</button>
          </div>
        </div>
      </div>
    </article>
  );
}
