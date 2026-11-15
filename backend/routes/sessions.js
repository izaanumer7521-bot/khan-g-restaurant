const r = require('express').Router();
const { Session, Customer, User } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const { dropSession } = require('../lib/sessions');

// Admin: every device that is currently signed in (customers and admin)
r.get('/', auth, wrap(async (req, res) => {
  const list = await Session.find().sort({ lastActiveAt: -1 }).limit(500).lean();
  const [cs, us] = await Promise.all([
    Customer.find({ _id: { $in: list.filter((s) => s.customer).map((s) => s.customer) } }).lean(),
    User.find({ _id: { $in: list.filter((s) => s.user).map((s) => s.user) } }).select('name email').lean(),
  ]);
  const cmap = Object.fromEntries(cs.map((c) => [String(c._id), c]));
  const umap = Object.fromEntries(us.map((u) => [String(u._id), u]));
  res.json(list.map((s) => {
    const c = s.customer && cmap[String(s.customer)];
    const u = s.user && umap[String(s.user)];
    return {
      _id: s._id, kind: s.kind, device: s.device, ip: s.ip, createdAt: s.createdAt, lastActiveAt: s.lastActiveAt,
      current: String(s._id) === req.sessionId,
      who: s.kind === 'admin' ? (u ? (u.name || 'Admin') + ' · ' + u.email : 'Admin') : (c ? c.name : 'Deleted customer'),
      phone: c ? c.phone : '', customerId: c ? c._id : null, blocked: !!(c && c.blocked),
    };
  }));
}));

// Remove one device: its token stops working, so that phone/computer is logged out on its next request.
r.delete('/:id', auth, wrap(async (req, res) => { await dropSession(req.params.id); res.json({ ok: true }); }));

// Remove every device of one customer
r.delete('/', auth, wrap(async (req, res) => {
  if (!req.query.customer) return res.status(400).json({ message: 'Say which customer' });
  const d = await Session.deleteMany({ kind: 'customer', customer: req.query.customer });
  res.json({ ok: true, removed: d.deletedCount });
}));

module.exports = r;
