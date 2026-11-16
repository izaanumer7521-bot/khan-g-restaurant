const webpush = require('web-push');
const Subscription = require('../models/Subscription');
const { Setting } = require('../models');

// ---- VAPID keys (free, no account needed) -------------------------------------------------------------------
// Best: set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT in your environment (npm run vapid makes a pair).
// If they are missing or invalid, a pair is created ONCE and stored in MongoDB so alerts still work.
let cache = null;

function subject() {
  const s = (process.env.VAPID_SUBJECT || '').trim();
  if (/^(mailto:|https:\/\/)/i.test(s)) return s;
  return 'mailto:' + (s || 'admin@example.com');
}

async function loadKeys() {
  if (cache) return cache;
  const pub = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const priv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  let problem = '';
  if (pub && priv) {
    try { webpush.setVapidDetails(subject(), pub, priv); cache = { publicKey: pub, privateKey: priv, subject: subject(), source: 'env' }; return cache; }
    catch (e) { problem = e.message; console.error('VAPID env keys rejected, using stored keys:', e.message); }
  }
  let doc = await Setting.findOne({ key: 'vapid' }).lean();
  if (!doc) {
    try { doc = await Setting.findOneAndUpdate({ key: 'vapid' }, { $setOnInsert: { value: webpush.generateVAPIDKeys() } }, { upsert: true, new: true }).lean(); }
    catch { doc = await Setting.findOne({ key: 'vapid' }).lean(); } // another server instance created it first
  }
  webpush.setVapidDetails(subject(), doc.value.publicKey, doc.value.privateKey);
  cache = { publicKey: doc.value.publicKey, privateKey: doc.value.privateKey, subject: subject(), source: 'database', problem };
  return cache;
}

async function getPublicKey() {
  try { return (await loadKeys()).publicKey; } catch (e) { console.error('push keys unavailable:', e.message); return ''; }
}

// ---- Sending + automatic dead-token cleanup -------------------------------------------------------------------
const MAX_FAILS = 10; // a device that fails this many sends in a row for other reasons is removed too

// Sends `payload` to every saved admin device (or only those whose _id is in `only`).
// - 404 / 410 from the push service = the device uninstalled the app / revoked permission -> its document is DELETED.
// - Any other error is recorded; after MAX_FAILS consecutive failures the device is deleted as well.
// Never throws, and never waits longer than `wait` ms, so a customer's order is never held up.
async function notifyAdmins(payload, { wait = 6000, only = null } = {}) {
  let keys;
  try { keys = await loadKeys(); } catch (e) { return { total: 0, sent: 0, removed: 0, errors: ['Push keys could not be loaded: ' + e.message] }; }
  const subs = await Subscription.find(only ? { _id: { $in: only } } : {}).lean();
  const out = { total: subs.length, sent: 0, removed: 0, errors: [] };
  const body = JSON.stringify(payload);
  const opts = { TTL: 60 * 60 * 24, urgency: 'high', vapidDetails: { subject: keys.subject, publicKey: keys.publicKey, privateKey: keys.privateKey } };

  const job = Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, opts);
      out.sent += 1;
      await Subscription.updateOne({ _id: s._id }, { $set: { lastSentAt: new Date(), failCount: 0, lastError: '' } });
    } catch (e) {
      const code = e.statusCode;
      if (code === 404 || code === 410) {                    // dead token: uninstalled / permission revoked / expired
        await Subscription.deleteOne({ _id: s._id });
        out.removed += 1;
        return;
      }
      const msg = `${code || 'network'}: ${String(e.body || e.message || '').slice(0, 140)}`;
      out.errors.push(msg);
      if ((s.failCount || 0) + 1 >= MAX_FAILS) { await Subscription.deleteOne({ _id: s._id }); out.removed += 1; return; }
      await Subscription.updateOne({ _id: s._id }, { $inc: { failCount: 1 }, $set: { lastError: msg } });
    }
  }).map((p) => p.catch((e) => out.errors.push(String(e.message || e)))));
  await Promise.race([job, new Promise((r) => setTimeout(r, wait))]);
  return out;
}

// Called from the createOrder controller (routes/orders.js)
function notifyNewOrder(order) {
  const items = (order.items || []).reduce((n, i) => n + (i.qty || 0), 0);
  const id = String(order._id).slice(-5).toUpperCase();
  return notifyAdmins({
    title: `New order #${id} · Rs. ${Number(order.total || 0).toLocaleString('en-PK')}`,
    body: `${order.customerName} · ${items} item${items === 1 ? '' : 's'} · ${order.type === 'pickup' ? 'Pickup' : 'Delivery'}`,
    tag: 'order-' + order._id,
    url: '/admin/orders',
    orderId: String(order._id),
  }, { wait: 4000 }); // never hold the customer's order for long
}

module.exports = { notifyAdmins, notifyNewOrder, getPublicKey };
