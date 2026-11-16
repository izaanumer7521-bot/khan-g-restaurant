import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../config.js';
import { chime, unlockAudio, audioReady } from '../lib/sound.js';
import { heal } from '../lib/alerts.js';

const SEEN = 'kg_seen_order';
const getSeen = () => { try { return localStorage.getItem(SEEN); } catch { return null; } };
const setSeen = (v) => { try { localStorage.setItem(SEEN, v); } catch { /* ignore */ } };

// Watches for new orders. Rings an alarm and shows a pop-up until the admin taps it.
// (The phone/laptop notification itself comes from the push message handled in sw.js.)
export default function AlertCenter() {
  const nav = useNavigate();
  const [popup, setPopup] = useState(null);      // { orders: [...] }
  const [sound, setSound] = useState(false);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return; busy.current = true;
    try {
      const d = await api('/orders/latest');
      const seen = getSeen();
      if (seen === null) { if (d.last) setSeen(d.last.createdAt); return; }   // first run: nothing to announce
      if (!d.last || new Date(d.last.createdAt) <= new Date(seen)) { setPopup(null); return; } // nothing new left (e.g. the order was deleted): stop the alarm
      const all = await api('/orders');
      const fresh = all.filter((o) => new Date(o.createdAt) > new Date(seen));
      if (!fresh.length) { setPopup(null); return; }
      const ids = fresh.map((o) => o._id).join();
      setPopup((p) => (p && p.orders.map((o) => o._id).join() === ids ? p : { orders: fresh }));
    } catch { /* offline or logged out: ignore */ } finally { busy.current = false; }
  }, []);

  // poll every 12s + when the tab comes back + when the service worker reports a push
  useEffect(() => {
    check();
    const t = setInterval(check, 12000);
    const vis = () => { if (!document.hidden) check(); };
    const msg = (e) => { if (e.data && e.data.type === 'order-alert' && !e.data.data?.test) check(); else if (e.data?.data?.test) chime(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('kg-orders-changed', check);
    navigator.serviceWorker?.addEventListener('message', msg);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('kg-orders-changed', check); navigator.serviceWorker?.removeEventListener('message', msg); };
  }, [check]);

  // browsers only allow sound after a tap: unlock on the first one
  useEffect(() => {
    const f = () => setSound(unlockAudio());
    window.addEventListener('pointerdown', f);
    window.addEventListener('keydown', f);
    return () => { window.removeEventListener('pointerdown', f); window.removeEventListener('keydown', f); };
  }, []);

  // keep this device's alert subscription fresh whenever the admin opens the panel
  useEffect(() => { heal(); }, []);

  // alarm: bell + vibration + flashing title, repeating until dismissed
  useEffect(() => {
    if (!popup) return undefined;
    const ring = () => { chime(); try { navigator.vibrate && navigator.vibrate([300, 120, 300, 120, 500]); } catch { /* ignore */ } };
    ring();
    const t = setInterval(ring, 4000);
    const old = document.title; let on = false;
    const f = setInterval(() => { on = !on; document.title = on ? `(${popup.orders.length}) NEW ORDER!` : old; }, 900);
    return () => { clearInterval(t); clearInterval(f); document.title = old; };
  }, [popup]);

  const dismiss = (go) => {
    if (popup) setSeen(popup.orders.reduce((m, o) => (o.createdAt > m ? o.createdAt : m), popup.orders[0].createdAt));
    setPopup(null);
    if (go) nav('/admin/orders');
  };

  return (
    <>
      {popup && (
        <div className="overlay alert-overlay" role="alertdialog" aria-label="New order">
          <div className="modal alert-modal">
            <div className="alert-bell" aria-hidden="true">🔔</div>
            <h2>{popup.orders.some((o) => Date.now() - new Date(o.createdAt).getTime() > 120000)
              ? `${popup.orders.length} order${popup.orders.length > 1 ? 's' : ''} came in while you were away`
              : popup.orders.length > 1 ? `${popup.orders.length} new orders!` : 'New order!'}</h2>
            <div className="alert-list">
              {popup.orders.slice(0, 4).map((o) => (
                <div key={o._id} className="alert-row">
                  <div><strong>{o.customerName}</strong> <span className={'badge ' + o.type}>{o.type}</span><div className="muted">#{String(o._id).slice(-5).toUpperCase()} · {o.items.reduce((s, i) => s + i.qty, 0)} items</div></div>
                  <strong>{money(o.total)}</strong>
                </div>
              ))}
              {popup.orders.length > 4 && <p className="muted">…and {popup.orders.length - 4} more</p>}
            </div>
            {!sound && !audioReady() && <button className="btn ghost full" onClick={() => setSound(unlockAudio())}>🔊 Tap to turn the sound on</button>}
            <button className="btn full" onClick={() => dismiss(true)}>View orders</button>
            <button className="link" onClick={() => dismiss(false)}>Dismiss</button>
          </div>
        </div>
      )}
    </>
  );
}
