import { useEffect, useState } from 'react';

const KEY = 'kg_customer';
export const getCustomer = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
export const saveCustomer = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ } window.dispatchEvent(new Event('kg:customer')); };
export const clearCustomer = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } window.dispatchEvent(new Event('kg:customer')); };

export function useCustomer() {
  const [c, setC] = useState(getCustomer);
  useEffect(() => { const f = () => setC(getCustomer()); window.addEventListener('kg:customer', f); return () => window.removeEventListener('kg:customer', f); }, []);
  return c;
}
