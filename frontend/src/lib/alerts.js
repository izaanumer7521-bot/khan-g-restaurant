import { api } from '../api.js';
import { unlockAudio, chime } from './sound.js';
import { isStandalone } from './install.jsx';

// Order alerts for this device. The truth always comes from the browser's own push subscription plus the server,
// never from a flag in localStorage, so clearing the cache or storage can't leave the toggle in a wrong state.
// States: 'on' | 'off' | 'blocked' | 'ios-install' | 'unsupported'

const OFF_FLAG = 'kg_alerts_off'; // only remembers "the admin switched it off on purpose"
const flag = {
  get: () => { try { return localStorage.getItem(OFF_FLAG) === '1'; } catch { return false; } },
  set: (v) => { try { v ? localStorage.setItem(OFF_FLAG, '1') : localStorage.removeItem(OFF_FLAG); } catch { /* ignore */ } },
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const toKey = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
const sameKey = (buf, arr) => { const a = new Uint8Array(buf); return a.length === arr.length && a.every((v, i) => v === arr[i]); };

// The active service worker registration (registers it if the page hasn't yet). Gives up after 10s with a clear message.
async function getReg() {
  if (!import.meta.env.PROD) throw new Error('Alerts only work on the deployed https site, not on localhost.');
  await navigator.serviceWorker.register('/sw.js');
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rej) => setTimeout(() => rej(new Error('The app is still starting. Close it fully, open it again and retry.')), 10000)),
  ]);
}

// One call at a time, so the toggle and the automatic repair can never register the phone twice at once.
let chain = Promise.resolve();
const queue = (fn) => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };

const platformState = () => {
  if (!supported()) return isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return null;
};

// Make sure this browser has a push subscription (with the server's current key) and the server has saved it.
async function ensure() {
  const reg = await getReg();
  const { key } = await api('/push/key');
  if (!key) throw new Error('The server has no push key. Check VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY and redeploy.');
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options && sub.options.applicationServerKey && !sameKey(sub.options.applicationServerKey, toKey(key))) {
    await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe(); sub = null; // made with an old key: it can never receive alerts
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
  await api('/push/subscribe', { method: 'POST', body: sub.toJSON() }); // upsert: same endpoint = same device document
  return sub;
}

// What the toggle shows right now.
export function readState() {
  return queue(async () => {
    const s = platformState(); if (s) return s;
    if (Notification.permission !== 'granted') return 'off';
    const reg = await getReg();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return 'off';
    const st = await api('/push/status', { method: 'POST', body: { endpoint: sub.endpoint } });
    if (!st.subscribed) await api('/push/subscribe', { method: 'POST', body: sub.toJSON() }); // server lost it: save it again
    return 'on';
  });
}

// Toggle ON. Must run from a tap: it unlocks sound and asks for notification permission.
export function turnOn() {
  unlockAudio();
  return queue(async () => {
    const s = platformState(); if (s) return s;
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p === 'denied') return 'blocked';
      if (p !== 'granted') return 'off';
    }
    await ensure();
    flag.set(false);
    chime(); // proves the sound is unlocked
    return 'on';
  });
}

// Toggle OFF.
export function turnOff() {
  return queue(async () => {
    flag.set(true);
    if (!supported()) return 'off';
    const reg = await getReg();
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); }
    return 'off';
  });
}

// Runs every time the admin app opens: if the phone already allowed notifications (and alerts weren't switched off on purpose)
// quietly restore the subscription, so cleared cache / storage or a browser update never silently disconnects the device.
export function heal() {
  return queue(async () => {
    const s = platformState(); if (s) return s;
    if (Notification.permission === 'granted' && !flag.get()) { await ensure(); return 'on'; }
    return 'off';
  }).catch(() => 'off');
}

export function sendTest() {
  return queue(async () => {
    const reg = await getReg();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) throw new Error('Alerts are not on for this device yet.');
    const r = await api('/push/test', { method: 'POST', body: { endpoint: sub.endpoint } });
    if (!r.sent) throw new Error(r.removed ? 'This device was no longer valid. Switch alerts off and on again.' : (r.errors && r.errors[0]) || 'The push service did not accept the test.');
    return r;
  });
}
