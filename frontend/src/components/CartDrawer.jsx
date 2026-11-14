import { useNavigate } from 'react-router-dom';
import { useCart } from '../store.jsx';
import { money } from '../config.js';

export default function CartDrawer() {
  const { items, setQty, total, open, setOpen } = useCart();
  const nav = useNavigate();
  if (!open) return null;
  return (
    <div className="overlay" onClick={() => setOpen(false)}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your order">
        <div className="drawer-h"><h3>Your order</h3><button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
        <div className="drawer-b">
          {!items.length && <p className="muted">Your cart is empty. Add something from the menu.</p>}
          {items.map((i) => (
            <div className="cart-row" key={i.key}>
              <div><strong>{i.name}{i.size ? ' (' + i.size + ')' : ''}</strong><div className="muted">{money(i.price)}</div></div>
              <div className="qty">
                <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="Remove one">−</button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="Add one">+</button>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="drawer-f">
            <div className="row"><span>Total</span><strong>{money(total)}</strong></div>
            <button className="btn full" onClick={() => { setOpen(false); nav('/checkout'); }}>Checkout</button>
          </div>
        )}
      </aside>
    </div>
  );
}
