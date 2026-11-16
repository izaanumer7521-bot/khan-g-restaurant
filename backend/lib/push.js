const webpush = require('web-push');
const { PushSub, PushLog, Setting } = require('../models');

// ---- Push keys -------------------------------------------------------------------------------------------
// Web Push needs a VAPID key pair. If you set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY they are used. If not (or if
// they are invalid) the server creates a pair ONCE, stores it in MongoDB and reuses it, so alerts work with zero setup.
let cache = null;

async function loadKeys() {
  if (cache) return cache;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@khang.pk';
  const pub = (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim(); // either name works
  const priv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  let envProblem = '';
  if (pub && priv) {
    try {
      webpush.setVapidDetails(subject, pub, priv); // throws if the pair is malformed
      cache = { publicKey: pub, privateKey: priv, subject, source: 'env', envProblem };
      return cache;
    } catch (e) { envProblem = e.message; console.error('VAPID env keys rejected, using automatic keys:', e.message); }
  }
  let doc = await Setting.findOne({ key: 'vapid' }).lean();
  if (!doc) {
    try { doc = await Setting.findOneAndUpdate({ key: 'vapid' }, { $setOnInsert: { value: webpush.generateVAPIDKeys() } }, { upsert: true, new: true }).lean(); }
    catch { doc = await Setting.findOne({ key: 'vapid' }).lean(); } // another server instance created it first
  }
  webpush.setVapidDetails(subject, doc.value.publicKey, doc.value.privateKey);
  cache = { publicKey: doc.value.publicKey, privateKey: doc.value.privateKey, subject, source: 'auto', envProblem };
  return cache;
}

async function getPushInfo() {
  try { const k = await loadKeys(); return { ready: true, publicKey: k.publicKey, source: k.source, problem: k.envProblem }; }
  catch (e) { return { ready: false, publicKey: '', source: '', problem: e.message }; }
}

// ---- Sending ---------------------------------------------------------------------------------------------
// Sends one notification to every admin device (or only the ids in `only`) and records the result per device.
// Never throws; waits at most `wait` ms so a customer's order is never held up.
async function notifyAdmins(payload, { wait = 6000, only = null } = {}) {
  let k;
  try { k = await loadKeys(); } catch (e) { return { sent: 0, devices: 0, results: [], reason: 'Push keys could not be loaded: ' + e.message }; }
  const subs = await PushSub.find(only ? { _id: { $in: only } } : {});
  const opts = { TTL: 60 * 60 * 24, urgency: 'high', vapidDetails: { subject: k.subject, publicKey: k.publicKey, privateKey: k.privateKey } };
  const results = [];
  const job = Promise.all(subs.map(async (s) => {
    try {
      // each device gets its own id inside the message so the phone can confirm receipt
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ ...payload, sid: String(s._id) }), opts);
      s.lastOkAt = new Date(); s.lastError = '';
      results.push({ id: String(s._id), device: s.device, ok: true });
    } catch (e) {
      const gone = e.statusCode === 404 || e.statusCode === 410;
      const keyClash = e.statusCode === 401 || e.statusCode === 403;
      s.lastError = gone ? 'Device unsubscribed (phone data was cleared or the browser dropped it). Open the admin app on it once to register again.' : keyClash ? 'Registered with an old key. Open the admin app on this device once and it fixes itself.' : `${e.statusCode || 'network'}: ${String(e.body || e.message || '').slice(0, 120)}`;
      results.push({ id: String(s._id), device: s.device, ok: false, error: s.lastError });
      // The registration is kept (never deleted automatically). It heals itself when the phone opens the admin app, or you remove it yourself.
    }
    try { await s.save(); } catch { /* recording the result is optional */ }
  }));
  await Promise.race([job, new Promise((r) => setTimeout(r, wait))]);
  const sent = results.filter((r) => r.ok).length;
  try { await PushLog.create({ title: payload.title, kind: payload.test ? 'test' : 'order', devices: subs.length, sent, pending: Math.max(subs.length - results.length, 0), results: results.map(({ device, ok, error }) => ({ device, ok, error })) }); } catch { /* the log is optional */ }
  return { sent, devices: subs.length, results };
}

module.exports = { notifyAdmins, getPushInfo };
