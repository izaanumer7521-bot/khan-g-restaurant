import { api } from '../api.js';

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const toKey = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const sameKey = (buf, arr) => { const a = new Uint8Array(buf); return a.length === arr.length && a.every((v, i) => v === arr[i]); };

export async function currentEndpoint() {
  if (!pushSupported()) return '';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? sub.endpoint : '';
}

// Returns: 'on' | 'off' | 'denied' | 'unsupported' | 'server-off'
// ask = true only from a button tap (browsers require a tap to show the permission box)
export async function syncPush(ask = false) {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') {
    if (!ask) return 'off';
    const p = await Notification.requestPermission();
    if (p !== 'granted') return p === 'denied' ? 'denied' : 'off';
  }
  const { key } = await api('/push/key');
  if (!key) return 'server-off';
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // a registration made with an older server key can never receive messages: replace it
  if (sub && sub.options && sub.options.applicationServerKey && !sameKey(sub.options.applicationServerKey, toKey(key))) { await sub.unsubscribe(); sub = null; }
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }); }
    catch { // an old subscription made with a different key
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
    }
  }
  await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
  return 'on';
}

export async function turnOffPush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); }
}

// Throw away this device's registration and make a fresh one
export async function repairPush() {
  if (!pushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.ready;
  const old = await reg.pushManager.getSubscription();
  if (old) { await api('/push/unsubscribe', { method: 'POST', body: { endpoint: old.endpoint } }).catch(() => {}); await old.unsubscribe(); }
  return syncPush(true);
}
