import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export default function useList(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const reload = useCallback(() => api(path).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)).finally(() => setLoading(false)), [path]);
  useEffect(() => { reload(); }, [reload]);
  const patch = async (id, body) => { await api(`${path}/${id}`, { method: 'PATCH', body }); reload(); window.dispatchEvent(new Event('kg-orders-changed')); };
  const remove = async (id) => { if (!window.confirm('Delete this permanently?')) return; await api(`${path}/${id}`, { method: 'DELETE' }); reload(); window.dispatchEvent(new Event('kg-orders-changed')); };
  return { data, loading, err, reload, patch, remove };
}
