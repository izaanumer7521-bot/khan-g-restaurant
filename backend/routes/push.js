const r = require('express').Router();
const { PushSub } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const { notifyAdmins, pushReady } = require('../lib/push');

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

r.post('/test', auth, wrap(async (req, res) => {
  if (!pushReady) return res.status(400).json({ message: 'Push alerts are not set up on the server yet (VAPID keys missing).' });
  const out = await notifyAdmins({ title: 'Test alert from Khan G', body: 'Order alerts are working on this device.', tag: 'test', url: '/admin/orders', test: true });
  res.json(out);
}));

module.exports = r;
