import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext();
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kg_cart')) || []; } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  useEffect(() => localStorage.setItem('kg_cart', JSON.stringify(items)), [items]);

  const add = (p) => {
    setItems((c) => c.find((i) => i._id === p._id)
      ? c.map((i) => (i._id === p._id ? { ...i, qty: i.qty + 1 } : i))
      : [...c, { _id: p._id, name: p.name, price: p.price, qty: 1 }]);
    setOpen(true);
  };
  const setQty = (id, q) => setItems((c) => (q <= 0 ? c.filter((i) => i._id !== id) : c.map((i) => (i._id === id ? { ...i, qty: q } : i))));
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return <Ctx.Provider value={{ items, add, setQty, clear, count, total, open, setOpen }}>{children}</Ctx.Provider>;
}
