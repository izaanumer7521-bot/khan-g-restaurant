const webpush = require('web-push');
const { PushSub } = require('../models');

const ready = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (ready) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@khang.pk', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

// Sends one notification to every admin device. Never throws; waits at most `wait` ms so
// the customer's order is not held up if a push service is slow.
async function notifyAdmins(payload, wait = 5000) {
  if (!ready) return { sent: 0, reason: 'VAPID keys are not set' };
  const subs = await PushSub.find();
  const body = JSON.stringify(payload);
  const job = Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 60 * 60 * 24, urgency: 'high' });
      return true;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await s.deleteOne().catch(() => {}); // device unsubscribed
      return false;
    }
  }));
  const res = await Promise.race([job, new Promise((r) => setTimeout(() => r(null), wait))]);
  return { sent: res ? res.filter((x) => x.value).length : 0, devices: subs.length };
}

module.exports = { notifyAdmins, pushReady: ready };
