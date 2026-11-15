import { useEffect, useState } from 'react';

const KEY = 'kg_customer';
const TKEY = 'kg_ctoken';
export const getCustomerToken = () => { try { return localStorage.getItem(TKEY) || ''; } catch { return ''; } };
// A customer counts as signed in only if this device holds a session token (old sign-ins without one must sign in again).
export const getCustomer = () => { try { return getCustomerToken() ? (JSON.parse(localStorage.getItem(KEY)) || null) : null; } catch { return null; } };
export const saveCustomer = (c) => {
  try {
    const { token, ...rest } = c || {};
    if (token) localStorage.setItem(TKEY, token);
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch { /* ignore */ }
  window.dispatchEvent(new Event('kg:customer'));
};
export const clearCustomer = () => { try { localStorage.removeItem(KEY); localStorage.removeItem(TKEY); } catch { /* ignore */ } window.dispatchEvent(new Event('kg:customer')); };

export function useCustomer() {
  const [c, setC] = useState(getCustomer);
  useEffect(() => { const f = () => setC(getCustomer()); window.addEventListener('kg:customer', f); return () => window.removeEventListener('kg:customer', f); }, []);
  return c;
}
