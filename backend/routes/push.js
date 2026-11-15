const r = require('express').Router();
const { PushSub } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const { notifyAdmins, pushReady, vapidError } = require('../lib/push');
const { notifyTelegram, telegramReady } = require('../lib/telegram');

r.get('/key', (req, res) => res.json({ key: pushReady ? process.env.VAPID_PUBLIC_KEY : '' }));

r.post('/subscribe', auth, wrap(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) return res.status(400).json({ message: 'Invalid subscription' });
  await PushSub.findOneAndUpdate({ endpoint }, { endpoint, keys, user: req.user._id, device: String(req.headers['user-agent'] || '').slice(0, 160) }, { upsert: true, new: true });
  res.json({ ok: true });
}));

r.post('/unsubscribe', auth, wrap(async (req, res) => {
  if (req.body && req.body.endpoint) await PushSub.deleteOne({ endpoint: req.body.endpoint });
  res.json({ ok: true });
}));

// What is set up and which devices are registered (shown on the admin Account page)
r.get('/status', auth, wrap(async (req, res) => {
  const subs = await PushSub.find().sort({ createdAt: -1 });
  res.json({
    serverReady: pushReady, serverProblem: pushReady ? '' : (vapidError || 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set in Vercel'),
    telegram: telegramReady,
    devices: subs.map((s) => ({ id: s._id, endpoint: s.endpoint, device: s.device, createdAt: s.createdAt, lastOkAt: s.lastOkAt, lastError: s.lastError })),
  });
}));

r.post('/test', auth, wrap(async (req, res) => {
  const [push, tg] = await Promise.all([
    notifyAdmins({ title: 'Test alert from Khan G', body: 'Order alerts are working on this device.', tag: 'test-' + Date.now(), url: '/admin/orders', test: true }),
    notifyTelegram('✅ Test alert from Khan G. Telegram order alerts are working.'),
  ]);
  res.json({ ...push, telegram: telegramReady ? tg : null });
}));

module.exports = r;
