const r = require('express').Router();
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const { notifyAdmins, getPublicKey } = require('../lib/push');
const { deviceName } = require('../lib/device');

const valid = (b) => b && typeof b.endpoint === 'string' && /^https:\/\//.test(b.endpoint) && b.keys && b.keys.p256dh && b.keys.auth;

// Public: the VAPID public key the browser needs to subscribe
r.get('/key', wrap(async (req, res) => res.json({ key: await getPublicKey() })));

// Save this device. The endpoint is unique, so calling this on every page load just refreshes the same document.
r.post('/subscribe', auth, wrap(async (req, res) => {
  if (!valid(req.body)) return res.status(400).json({ message: 'Invalid subscription' });
  const { endpoint, keys } = req.body;
  const save = () => Subscription.findOneAndUpdate(
    { endpoint },
    { $set: { keys: { p256dh: keys.p256dh, auth: keys.auth }, user: req.user._id, device: deviceName(req.headers['user-agent']), lastSeenAt: new Date(), failCount: 0, lastError: '' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  try { await save(); }
  catch (e) { if (e.code !== 11000) throw e; await save(); } // two requests upserted the same new device at once: the second just updates
  res.json({ ok: true, total: await Subscription.countDocuments() });
}));

// The toggle asks: does the server really have THIS device?
r.post('/status', auth, wrap(async (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  const [mine, total] = await Promise.all([endpoint ? Subscription.findOne({ endpoint }).select('lastSentAt lastError failCount').lean() : null, Subscription.countDocuments()]);
  res.json({ subscribed: !!mine, total, serverReady: !!(await getPublicKey()), lastSentAt: mine && mine.lastSentAt, lastError: (mine && mine.lastError) || '', failCount: (mine && mine.failCount) || 0 });
}));

// Toggle switched off
r.post('/unsubscribe', auth, wrap(async (req, res) => {
  if (req.body && req.body.endpoint) await Subscription.deleteOne({ endpoint: req.body.endpoint });
  res.json({ ok: true });
}));

// The browser swapped this phone's registration while the app was closed (sent by sw.js, no login needed: the OLD endpoint proves identity)
r.post('/renew', wrap(async (req, res) => {
  const { oldEndpoint } = req.body || {};
  if (!oldEndpoint || !valid(req.body)) return res.status(400).json({ message: 'Invalid subscription' });
  const old = await Subscription.findOne({ endpoint: oldEndpoint });
  if (!old) return res.status(404).json({ message: 'Unknown registration' });
  await Subscription.deleteOne({ endpoint: req.body.endpoint, _id: { $ne: old._id } });
  old.endpoint = req.body.endpoint; old.keys = { p256dh: req.body.keys.p256dh, auth: req.body.keys.auth }; old.failCount = 0; old.lastError = ''; old.lastSeenAt = new Date();
  await old.save();
  res.json({ ok: true });
}));

// "Send test alert" for this device
r.post('/test', auth, wrap(async (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  const mine = endpoint ? await Subscription.findOne({ endpoint }).select('_id') : null;
  if (!mine) return res.status(404).json({ message: 'This device is not registered yet. Switch alerts off and on again.' });
  // optional delay (max 6 s) so the admin can close the app / lock the phone before the alert is sent
  const delay = Math.min(6, Math.max(0, Number(req.body && req.body.delay) || 0));
  if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
  const out = await notifyAdmins({ title: 'Test alert', body: 'Order alerts are working on this device.', tag: 'test-' + Date.now(), url: '/admin/orders', test: true }, { only: [mine._id] });
  res.json(out);
}));

module.exports = r;
