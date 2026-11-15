const jwt = require('jsonwebtoken');
const { Session } = require('../models');
const { deviceName, clientIp } = require('./device');

const DAY = 24 * 60 * 60 * 1000;
const LIFE = { admin: 7 * DAY, customer: 30 * DAY };

// Creates a session row and returns a signed token that carries its id.
async function startSession(kind, owner, req) {
  const s = await Session.create({
    kind, ...(kind === 'admin' ? { user: owner._id } : { customer: owner._id }),
    device: deviceName(req.headers['user-agent']), ip: clientIp(req), expiresAt: new Date(Date.now() + LIFE[kind]),
  });
  const token = jwt.sign({ id: owner._id, sid: s._id, k: kind }, process.env.JWT_SECRET, { expiresIn: Math.floor(LIFE[kind] / 1000) });
  return { token, session: s };
}

// Verifies a token AND that its session still exists (so deleting a device logs it out).
async function readSession(token, kind) {
  const p = jwt.verify(token, process.env.JWT_SECRET);
  if (!p.sid || p.k !== kind) return null;
  const s = await Session.findById(p.sid);
  if (!s) return null;
  if (!s.lastActiveAt || Date.now() - s.lastActiveAt.getTime() > 60 * 1000) { s.lastActiveAt = new Date(); s.save().catch(() => {}); }
  return { session: s, id: p.id };
}

module.exports = { startSession, readSession };
