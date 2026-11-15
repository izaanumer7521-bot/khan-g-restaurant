import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AlertCenter from './AlertCenter.jsx';
import { InstallButton } from '../lib/install.jsx';

const links = [['/admin', 'Dashboard'], ['/admin/orders', 'Orders'], ['/admin/menu', 'Menu'], ['/admin/categories', 'Categories'], ['/admin/customers', 'Customers'], ['/admin/messages', 'Messages'], ['/admin/settings', 'Account']];

export default function AdminLayout() {
  const nav = useNavigate();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    api('/auth/me').then(() => setOk(true)).catch(() => { localStorage.removeItem('kg_token'); nav('/admin/login'); });
  }, [nav]);
  const logout = () => { localStorage.removeItem('kg_token'); nav('/admin/login'); };
  if (!ok) return <div className="center" style={{ padding: 80 }}>Loading…</div>;

  return (
    <div className="admin">
      <aside className="side">
        <img className="logo-img big" src="/logo.png" alt="Khan G" />
        <nav>{links.map(([to, l]) => <NavLink key={to} to={to} end={to === '/admin'}>{l}</NavLink>)}</nav>
        <InstallButton className="btn ghost sm install" label="Install admin app" name="Khan G Admin" />
        <button className="btn ghost sm logout" onClick={logout}>Log out</button>
        <a className="muted sitelink" href="/" target="_blank" rel="noreferrer">View website</a>
      </aside>
      <section className="admin-main"><AlertCenter /><Outlet /></section>
    </div>
  );
}
