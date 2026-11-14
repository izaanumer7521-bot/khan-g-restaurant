export const API = import.meta.env.VITE_API_URL || '';
export const imgUrl = (s) => (!s ? '' : s.startsWith('http') ? s : API + s);

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = localStorage.getItem('kg_token');
  if (t) headers.Authorization = 'Bearer ' + t;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(API + '/api' + path, { method, headers, body: payload }); }
  catch { throw new Error('Cannot reach the server. Check your internet and try again.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}
