import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../store.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const { count, setOpen: openCart } = useCart();
  const loc = useLocation();
  const [bump, setBump] = useState(false);
  useEffect(() => {
    const f = () => { setBump(false); requestAnimationFrame(() => setBump(true)); setTimeout(() => setBump(false), 700); };
    window.addEventListener('kg:added', f);
    return () => window.removeEventListener('kg:added', f);
  }, []);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 40);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);

  return (
    <header className={'nav' + (solid || open ? ' solid' : '')}>
      <Link to="/" className="logo" aria-label="Khan G home"><img className="logo-img" src="/logo.png" alt="Khan G" /></Link>
      <nav className={'links' + (open ? ' open' : '')}>
        {[['/', 'Home'], ['/menu', 'Menu'], ['/contact', 'Contact']].map(([to, l]) => (
          <NavLink key={to} to={to} end>{l}</NavLink>
        ))}
      </nav>
      <div className="nav-r">
        <button className={'cartbtn' + (bump ? ' bump' : '')} onClick={() => openCart(true)} aria-label="Open cart">
          Cart{count > 0 && <i>{count}</i>}
        </button>
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
