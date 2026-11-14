import { useCart } from '../store.jsx';
import { imgUrl } from '../api.js';
import { money } from '../config.js';

export default function Dish({ item }) {
  const { add } = useCart();
  return (
    <article className="dish">
      <div className="dish-img">
        {item.image ? <img src={imgUrl(item.image)} alt={item.name} loading="lazy" /> : <span>{item.name[0]}</span>}
        {!item.available && <b className="sold">Sold out</b>}
      </div>
      <div className="dish-body">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="dish-foot">
          <strong>{money(item.price)}</strong>
          <button className="btn sm" disabled={!item.available} onClick={() => add(item)}>Add to order</button>
        </div>
      </div>
    </article>
  );
}
