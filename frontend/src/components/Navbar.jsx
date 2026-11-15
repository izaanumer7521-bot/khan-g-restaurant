import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../store.jsx';
import { SITE } from '../config.js';
import { useCustomer } from '../lib/customer.js';
import { InstallButton } from '../lib/install.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const { count, setOpen: openCart } = useCart();
  const loc = useLocation();
  const me = useCustomer();
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

  const links = [['/', 'Home'], ['/menu', 'Menu'], ['/contact', 'Contact']];
  return (
    <>
      <header className={'nav' + (solid || open ? ' solid' : '')}>
        <Link to="/" className="logo" aria-label="Khan G home"><img className="logo-img" src="/logo.png" alt="Khan G" /></Link>
        <nav className="links">
          {links.map(([to, l]) => <NavLink key={to} to={to} end>{l}</NavLink>)}
        </nav>
        <div className="nav-r">
          <Link to="/signin" className="signin-link">{me ? me.name.split(' ')[0] : 'Sign in'}</Link>
          <button className={'cartbtn' + (bump ? ' bump' : '')} onClick={() => openCart(true)} aria-label="Open cart">
            Cart{count > 0 && <i>{count}</i>}
          </button>
          <button className={'burger' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu">
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* phone menu: lives outside the header so it always covers the full screen */}
      <div className={'mnav-bg' + (open ? ' show' : '')} onClick={() => setOpen(false)} />
      <aside id="mobile-menu" className={'mnav' + (open ? ' open' : '')} aria-hidden={!open}>
        <nav>
          {links.map(([to, l]) => <NavLink key={to} to={to} end tabIndex={open ? 0 : -1}>{l}</NavLink>)}
        </nav>
        <Link to="/menu" className="btn full" tabIndex={open ? 0 : -1}>Order online</Link>
        <Link to="/signin" className="btn ghost full" tabIndex={open ? 0 : -1}>{me ? 'Signed in as ' + me.name.split(' ')[0] : 'Sign in'}</Link>
        <InstallButton className="btn ghost full" label="Install the app" />
        <a className="btn ghost full" href={'tel:' + SITE.phone.replace(/\s/g, '')} tabIndex={open ? 0 : -1}>Call {SITE.phone}</a>
        <p className="mnav-note">{SITE.hours.map(([k, v]) => k + ': ' + v).join(' · ')}</p>
      </aside>
    </>
  );
}
