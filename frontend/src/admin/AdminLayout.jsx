import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AlertCenter from './AlertCenter.jsx';
import AlertToggle from './AlertToggle.jsx';
import Icon from './icons.jsx';
import { InstallButton } from '../lib/install.jsx';

const links = [
  ['/admin', 'Dashboard', 'dashboard'], ['/admin/orders', 'Orders', 'orders'], ['/admin/menu', 'Menu', 'menu'], ['/admin/categories', 'Categories', 'categories'],
  ['/admin/customers', 'Customers', 'customers'], ['/admin/devices', 'Devices', 'devices'], ['/admin/messages', 'Messages', 'messages'], ['/admin/settings', 'Account', 'account'],
];

export default function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.__kgApp === 'site') window.location.reload(); // reload once so the browser sees the admin app manifest
  }, []);
  useEffect(() => {
    api('/auth/me').then(() => setOk(true)).catch(() => { localStorage.removeItem('kg_token'); nav('/admin/login'); });
  }, [nav]);
  // If another admin device removes this one in Devices, the next check logs this device out automatically.
  useEffect(() => {
    if (!ok) return undefined;
    const check = () => { if (document.visibilityState === 'visible') api('/auth/me').catch(() => {}); };
    const t = setInterval(check, 30000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); };
  }, [ok]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* token is dropped below anyway */ }
    localStorage.removeItem('kg_token'); nav('/admin/login');
  };
  if (!ok) return <div className="center" style={{ padding: 80 }}>Loading…</div>;

  return (
    <div className="admin">
      <header className="topbar">
        <button className="hamb" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><span /><span /><span /></button>
        <img className="logo-img" src="/logo.png" alt="" />
        <b>Khan G Admin</b>
      </header>
      <div className={'side-bg' + (open ? ' show' : '')} onClick={() => setOpen(false)} />
      <aside className={'side' + (open ? ' open' : '')}>
        <button className="side-x" onClick={() => setOpen(false)} aria-label="Close menu">×</button>
        <div className="side-brand">
          <img className="logo-img" src="/logo.png" alt="Khan G" />
          <div><b>Khan G</b><small>Admin panel</small></div>
        </div>
        <nav>{links.map(([to, l, ic]) => <NavLink key={to} to={to} end={to === '/admin'}><Icon name={ic} />{l}</NavLink>)}</nav>
        <div className="side-foot">
          <AlertToggle />
          <InstallButton always className="btn ghost sm install" label="Install admin app" name="Khan G Admin" />
          <button className="btn ghost sm logout" onClick={logout}>Log out</button>
          <a className="muted sitelink" href="/" target="_blank" rel="noreferrer">View website</a>
        </div>
      </aside>
      <section className="admin-main"><AlertCenter /><Outlet /></section>
    </div>
  );
}
