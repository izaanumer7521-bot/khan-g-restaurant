import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../store.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const { count, setOpen: openCart } = useCart();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 40);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);

  return (
    <header className={'nav' + (solid || open ? ' solid' : '')}>
      <Link to="/" className="logo">KHAN<b>G</b></Link>
      <nav className={'links' + (open ? ' open' : '')}>
        {[['/', 'Home'], ['/menu', 'Menu'], ['/reserve', 'Reserve a table'], ['/contact', 'Contact']].map(([to, l]) => (
          <NavLink key={to} to={to} end>{l}</NavLink>
        ))}
      </nav>
      <div className="nav-r">
        <button className="cartbtn" onClick={() => openCart(true)} aria-label="Open cart">
          Cart{count > 0 && <i>{count}</i>}
        </button>
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
