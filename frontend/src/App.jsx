import { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import Home from './pages/Home.jsx';
import Menu from './pages/Menu.jsx';
import Product from './pages/Product.jsx';
import Contact from './pages/Contact.jsx';
import Checkout from './pages/Checkout.jsx';
import SignIn from './pages/SignIn.jsx';
import { InstallBanner } from './lib/install.jsx';
import Login from './admin/Login.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import Dashboard from './admin/Dashboard.jsx';
import MenuManager from './admin/MenuManager.jsx';
import Orders from './admin/Orders.jsx';
import Categories from './admin/Categories.jsx';
import Settings from './admin/Settings.jsx';
import Messages from './admin/Messages.jsx';
import Customers from './admin/Customers.jsx';

function Public() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (<><Navbar /><main><Outlet /></main><Footer /><CartDrawer /><InstallBanner /></>);
}

export default function App() {
  return (
    <Routes>
      <Route element={<Public />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/menu/:id" element={<Product />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="*" element={<div className="sec page center"><h1 className="title">Page not found</h1></div>} />
      </Route>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="menu" element={<MenuManager />} />
        <Route path="orders" element={<Orders />} />
        <Route path="categories" element={<Categories />} />
        <Route path="customers" element={<Customers />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
