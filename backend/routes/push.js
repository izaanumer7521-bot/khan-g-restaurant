const r = require('express').Router();
const { PushSub } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const { notifyAdmins, getPushInfo } = require('../lib/push');
const { notifyTelegram, telegramReady } = require('../lib/telegram');
const { deviceName } = require('../lib/device');

r.get('/key', wrap(async (req, res) => { const i = await getPushInfo(); res.json({ key: i.ready ? i.publicKey : '' }); }));

// Register (or refresh) this phone/computer. Called every time the admin app opens, so a lost registration heals itself.
r.post('/subscribe', auth, wrap(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) return res.status(400).json({ message: 'Invalid subscription' });
  await PushSub.findOneAndUpdate({ endpoint }, { endpoint, keys, user: req.user._id, session: req.sessionId, device: deviceName(req.headers['user-agent']) }, { upsert: true, new: true });
  res.json({ ok: true });
}));

// The browser rotated this phone's registration while the app was closed (see sw.js). The old endpoint proves who it is.
r.post('/renew', wrap(async (req, res) => {
  const { oldEndpoint, endpoint, keys } = req.body || {};
  if (!oldEndpoint || !endpoint || !keys || !keys.p256dh || !keys.auth) return res.status(400).json({ message: 'Invalid subscription' });
  const s = await PushSub.findOne({ endpoint: oldEndpoint });
  if (!s) return res.status(404).json({ message: 'Unknown registration' });
  await PushSub.deleteOne({ endpoint, _id: { $ne: s._id } });
  s.endpoint = endpoint; s.keys = keys; s.lastError = '';
  await s.save();
  res.json({ ok: true });
}));

r.post('/unsubscribe', auth, wrap(async (req, res) => {
  if (req.body && req.body.endpoint) await PushSub.deleteOne({ endpoint: req.body.endpoint });
  res.json({ ok: true });
}));

// Remove one device from the alert list
r.delete('/devices/:id', auth, wrap(async (req, res) => { await PushSub.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// What is set up and which devices receive alerts (Account > Notifications)
r.get('/status', auth, wrap(async (req, res) => {
  const [info, subs] = await Promise.all([getPushInfo(), PushSub.find().sort({ createdAt: -1 })]);
  res.json({
    serverReady: info.ready, keySource: info.source, serverProblem: info.ready ? '' : info.problem, keyNote: info.ready ? info.problem : '',
    telegram: telegramReady,
    devices: subs.map((s) => ({ id: s._id, endpoint: s.endpoint, device: s.device || 'Unknown device', createdAt: s.createdAt, lastOkAt: s.lastOkAt, lastError: s.lastError })),
  });
}));

// Send a test alert to one device ({ id }) or to every device (no id)
r.post('/test', auth, wrap(async (req, res) => {
  const id = req.body && req.body.id;
  const [push, tg] = await Promise.all([
    notifyAdmins({ title: 'Test alert from Khan G', body: 'Order alerts are working on this device.', tag: 'test-' + Date.now(), url: '/admin/orders', test: true }, { only: id ? [id] : null }),
    id ? Promise.resolve(null) : notifyTelegram('✅ Test alert from Khan G. Telegram order alerts are working.'),
  ]);
  res.json({ ...push, telegram: id || !telegramReady ? null : tg });
}));

module.exports = r;
