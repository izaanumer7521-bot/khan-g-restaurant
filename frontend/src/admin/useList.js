import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export default function useList(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const reload = useCallback(() => api(path).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)).finally(() => setLoading(false)), [path]);
  useEffect(() => { reload(); }, [reload]);
  const patch = async (id, body) => { await api(`${path}/${id}`, { method: 'PATCH', body }); reload(); };
  const remove = async (id) => { if (!window.confirm('Delete this permanently?')) return; await api(`${path}/${id}`, { method: 'DELETE' }); reload(); };
  return { data, loading, err, reload, patch, remove };
}
