import { api } from '../api.js';

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const toKey = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

// A random id kept in this phone's storage so the server keeps exactly ONE row for this device, however often it re-registers.
export function getDeviceId() {
  try {
    let id = localStorage.getItem('kg_device');
    if (!id) { id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem('kg_device', id); }
    return id;
  } catch { return ''; }
}

const sameKey = (buf, arr) => { const a = new Uint8Array(buf); return a.length === arr.length && a.every((v, i) => v === arr[i]); };

export async function currentEndpoint() {
  if (!pushSupported()) return '';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? sub.endpoint : '';
}

// Returns: 'on' | 'off' | 'denied' | 'unsupported' | 'server-off'. Throws a readable Error if registering fails.
// ask = true only from a button tap (browsers require a tap to show the permission box)
// Calls run one at a time, so the admin layout and the Account page can never register the phone at the same moment.
let chain = Promise.resolve();
export function syncPush(ask = false) {
  const p = chain.then(() => doSync(ask));
  chain = p.catch(() => {});
  return p;
}

async function doSync(ask) {
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
  if (sub && sub.options && sub.options.applicationServerKey && !sameKey(sub.options.applicationServerKey, toKey(key))) {
    await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe(); sub = null;
  }
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }); }
    catch (e) {
      const old = await reg.pushManager.getSubscription();
      if (!old) throw new Error('The browser could not create a push registration: ' + (e && e.message ? e.message : e));
      await old.unsubscribe(); // an old subscription made with a different key
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
    }
  }
  await api('/push/subscribe', { method: 'POST', body: { ...sub.toJSON(), deviceId: getDeviceId() } });
  return 'on';
}

// Send this browser's existing registration to the server again (used when the server has no record of it)
export async function registerCurrent() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) throw new Error('This browser has no push registration yet');
  return api('/push/subscribe', { method: 'POST', body: { ...sub.toJSON(), deviceId: getDeviceId() } });
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
