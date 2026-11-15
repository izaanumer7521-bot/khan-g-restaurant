import { clearCustomer, getCustomerToken } from './lib/customer.js';

export const API = import.meta.env.VITE_API_URL || '';
export const imgUrl = (s) => (!s ? '' : s.startsWith('http') ? s : API + s);

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = localStorage.getItem('kg_token');
  if (t) headers.Authorization = 'Bearer ' + t;
  const ct = getCustomerToken();
  if (ct) headers['x-customer-token'] = ct;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(API + '/api' + path, { method, headers, body: payload }); }
  catch { throw new Error('Cannot reach the server. Check your internet and try again.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // This phone/computer was removed (or the customer was blocked) by the admin: log out automatically.
    if (ct && (data.code === 'SIGNED_OUT' || data.code === 'BLOCKED')) {
      try { sessionStorage.setItem('kg_notice', data.message || ''); } catch { /* ignore */ }
      clearCustomer();
    }
    if (res.status === 401 && !data.code && t && path !== '/auth/login' && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('kg_token');
      try { sessionStorage.setItem('kg_admin_notice', data.message || 'You were logged out.'); } catch { /* ignore */ }
      window.location.replace('/admin/login');
    }
    const e = new Error(data.message || 'Something went wrong');
    e.code = data.code;
    throw e;
  }
  return data;
}
