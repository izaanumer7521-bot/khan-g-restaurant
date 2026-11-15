const webpush = require('web-push');
const { PushSub } = require('../models');

const ready = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let vapidError = '';
if (ready) {
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@khang.pk', process.env.VAPID_PUBLIC_KEY.trim(), process.env.VAPID_PRIVATE_KEY.trim());
  } catch (e) { vapidError = e.message; console.error('VAPID setup failed:', e.message); }
}
const enabled = ready && !vapidError;

// Sends one notification to every admin device and records what happened on each.
// Never throws; waits at most `wait` ms so the customer's order is not held up.
async function notifyAdmins(payload, wait = 6000) {
  if (!enabled) return { sent: 0, devices: 0, results: [], reason: vapidError || 'VAPID keys are not set on the server' };
  const subs = await PushSub.find();
  const body = JSON.stringify(payload);
  const results = [];
  const job = Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 60 * 60 * 24, urgency: 'high' });
      s.lastOkAt = new Date(); s.lastError = '';
      results.push({ id: String(s._id), ok: true });
    } catch (e) {
      const gone = e.statusCode === 404 || e.statusCode === 410;
      s.lastError = gone ? 'Device unsubscribed' : `${e.statusCode || 'network'}: ${String(e.body || e.message || '').slice(0, 120)}`;
      results.push({ id: String(s._id), ok: false, error: s.lastError });
      if (gone) { await s.deleteOne().catch(() => {}); return; }   // phone removed the subscription
    }
    try { await s.save(); } catch { /* recording the result is optional */ }
  }));
  await Promise.race([job, new Promise((r) => setTimeout(r, wait))]);
  return { sent: results.filter((r) => r.ok).length, devices: subs.length, results };
}

module.exports = { notifyAdmins, pushReady: enabled, vapidError };
