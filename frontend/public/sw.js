// Khan G service worker: offline shell, and order alerts for the admin app.
const CACHE = 'kg-v1';
const SHELL = ['/', '/logo.png', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.endsWith('.mp4')) return;

  // Pages: network first, fall back to the saved app shell when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/').then((r) => r || Response.error())));
    return;
  }
  // Built files and icons: cache first (file names change with every build)
  if (url.pathname.startsWith('/assets/') || /\.(png|ico|webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});

// ---- Admin order alerts (Web Push) ----
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'New order', body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'New order', {
      body: d.body || '',
      icon: '/admin-192.png',
      badge: '/favicon-192.png',
      tag: d.tag || 'order',
      renotify: true,
      requireInteraction: true,   // stays on screen until the admin taps it
      silent: false,              // plays the phone's notification sound
      vibrate: [400, 150, 400, 150, 600],
      timestamp: Date.now(),
      data: { url: d.url || '/admin/orders' },
      actions: [{ action: 'open', title: 'View order' }],
    });
    // Tell the server this phone really received the alert (shown in Account > Notifications)
    if (d.sid) await fetch('/api/push/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: d.sid }), keepalive: true }).catch(() => {});
    // If the admin app is open, let it ring its own alarm too
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach((w) => w.postMessage({ type: 'order-alert', data: d }));
  })());
});

// The browser can replace a phone's push registration at any time (even with the app closed). Re-register in the
// background so order alerts keep arriving without anyone opening the admin app.
const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    try {
      const old = e.oldSubscription;
      let key = old && old.options && old.options.applicationServerKey;
      if (!key) { const j = await (await fetch('/api/push/key')).json(); key = b64ToBytes(j.key); }
      const sub = e.newSubscription || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const { endpoint, keys } = sub.toJSON();
      if (old && old.endpoint) await fetch('/api/push/renew', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldEndpoint: old.endpoint, endpoint, keys }) });
    } catch { /* the app re-registers itself the next time it is opened */ }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin/orders';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => new URL(w.url).pathname.startsWith('/admin'));
    if (open) { await open.focus(); open.postMessage({ type: 'order-alert', data: {} }); return; }
    await self.clients.openWindow(url);
  })());
});
