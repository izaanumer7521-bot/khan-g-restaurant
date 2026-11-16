const r = require('express').Router();
const { PushSub, PushLog } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const { notifyAdmins, getPushInfo } = require('../lib/push');
const { deviceName } = require('../lib/device');

const DEAD = /^(Device unsubscribed|Registered with an old key)/; // failures that can never recover on their own

r.get('/key', wrap(async (req, res) => { const i = await getPushInfo(); res.json({ key: i.ready ? i.publicKey : '' }); }));

// Register (or refresh) this phone/computer. Called every time the admin app opens, so a lost registration heals itself.
r.post('/subscribe', auth, wrap(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) return res.status(400).json({ message: 'Invalid subscription' });
  const device = deviceName(req.headers['user-agent']);
  const deviceId = String((req.body && req.body.deviceId) || '').slice(0, 80);
  // One row per physical phone/computer: the same deviceId always updates its own row, so re-registering never creates a second one.
  const save = async () => {
    await PushSub.deleteMany({ endpoint, ...(deviceId ? { deviceId: { $ne: deviceId } } : {}) }); // an older row that holds this same endpoint
    return PushSub.findOneAndUpdate(deviceId ? { deviceId } : { endpoint }, { endpoint, keys, user: req.user._id, session: req.sessionId, device, deviceId }, { upsert: true, new: true });
  };
  let doc;
  try { doc = await save(); }
  catch (e) {
    // Two requests saving the same phone at the same moment (or an old leftover database index) can collide. Clean up and try once more.
    if (e.code !== 11000) throw e;
    await PushSub.syncIndexes().catch(() => {});
    doc = await save();
  }
  // This browser can only hold one registration, so any other row from this same login is an old copy of it. Remove those, plus broken
  // registrations of the same kind of device.
  await PushSub.deleteMany({ _id: { $ne: doc._id }, $or: [{ session: req.sessionId }, { device, lastError: { $regex: DEAD } }] });
  res.json({ ok: true, id: doc._id, total: await PushSub.countDocuments() });
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

// Alerts stay registered until the owner removes the device here (or turns alerts off on the device itself)
r.delete('/devices/:id', auth, wrap(async (req, res) => { await PushSub.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// What is set up and which devices receive alerts (Account > Notifications)
r.get('/status', auth, wrap(async (req, res) => {
  const [info, subs, logs] = await Promise.all([getPushInfo(), PushSub.find().sort({ createdAt: -1 }), PushLog.find().sort({ createdAt: -1 }).limit(8)]);
  res.json({
    serverReady: info.ready, keySource: info.source, serverProblem: info.ready ? '' : info.problem, keyNote: info.ready ? info.problem : '',
    logs: logs.map((l) => ({ id: l._id, title: l.title, kind: l.kind, at: l.createdAt, devices: l.devices, sent: l.sent, pending: l.pending, results: l.results })),
    devices: subs.map((s) => ({ id: s._id, deviceId: s.deviceId, endpoint: s.endpoint, device: s.device || 'Unknown device', createdAt: s.createdAt, openedAt: s.updatedAt, lastOkAt: s.lastOkAt, lastError: s.lastError })),
  });
}));

// Remove registrations the push service has told us are gone for good (phone data cleared, old key)
r.post('/cleanup', auth, wrap(async (req, res) => { const d = await PushSub.deleteMany({ lastError: { $regex: DEAD } }); res.json({ removed: d.deletedCount }); }));

// Send a test alert to one device ({ id }) or to every device (no id)
r.post('/test', auth, wrap(async (req, res) => {
  const id = req.body && req.body.id;
  res.json(await notifyAdmins({ title: 'Test alert from Khan G', body: 'Order alerts are working on this device.', tag: 'test-' + Date.now(), url: '/admin/orders', test: true }, { only: id ? [id] : null }));
}));

module.exports = r;
