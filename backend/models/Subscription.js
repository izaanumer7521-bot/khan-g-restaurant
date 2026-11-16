const mongoose = require('mongoose');

// One document per admin phone/computer that turned on order alerts.
// The push `endpoint` is the device's identity: saving the same endpoint again updates the same document (upsert),
// so refreshing the page, re-opening the app or toggling alerts can never create duplicate devices.
// Stored in its own collection ("adminsubscriptions") so no stale indexes from older versions can interfere.
const subscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true, index: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  device: { type: String, default: '' },        // e.g. "Chrome on Android"
  lastSeenAt: { type: Date, default: Date.now }, // last time the admin app registered this device
  lastSentAt: Date,                              // last push the push service accepted
  failCount: { type: Number, default: 0 },       // consecutive failed sends (reset on success)
  lastError: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.AdminSubscription || mongoose.model('AdminSubscription', subscriptionSchema);
