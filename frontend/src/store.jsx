import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext();
export const useCart = () => useContext(Ctx);

// One cart line per dish + size, e.g. "Karahi Half" and "Karahi Full" are separate lines.
const keyOf = (id, size) => id + '|' + (size || '');

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('kg_cart')) || []).map((i) => ({ ...i, key: i.key || keyOf(i._id, i.size) })); } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  useEffect(() => { try { localStorage.setItem('kg_cart', JSON.stringify(items)); } catch {} }, [items]);

  // p = dish, size = { label, price } or undefined for single-price dishes
  const add = (p, size, n = 1) => {
    const key = keyOf(p._id, size && size.label);
    const price = size ? size.price : p.price;
    setItems((c) => c.find((i) => i.key === key)
      ? c.map((i) => (i.key === key ? { ...i, qty: i.qty + n } : i))
      : [...c, { key, _id: p._id, name: p.name, size: size ? size.label : '', price, qty: n }]);
    window.dispatchEvent(new Event('kg:added'));
  };
  const setQty = (key, q) => setItems((c) => (q <= 0 ? c.filter((i) => i.key !== key) : c.map((i) => (i.key === key ? { ...i, qty: q } : i))));
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return <Ctx.Provider value={{ items, add, setQty, clear, count, total, open, setOpen }}>{children}</Ctx.Provider>;
}
