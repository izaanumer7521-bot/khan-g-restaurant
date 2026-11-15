const r = require('express').Router();
const { Customer, Order, Session } = require('../models');
const auth = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');
const wrap = require('../middleware/wrap');
const normalizePhone = require('../lib/phone');
const { startSession } = require('../lib/sessions');

const publicCustomer = (c) => ({ name: c.name, phone: c.phone, address: c.address });

// Customer "sign in": name + phone are both required. No password; it saves/updates the customer and opens a session for THIS device.
r.post('/signin', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = normalizePhone(req.body.phone);
  if (name.length < 2) return res.status(400).json({ message: 'Please enter your name' });
  if (!phone) return res.status(400).json({ message: 'Please enter a valid phone number, e.g. 0309 6313398' });
  const existing = await Customer.findOne({ phone });
  if (existing && existing.blocked) return res.status(403).json({ message: 'Your account has been blocked. Please call the restaurant.', code: 'BLOCKED' });
  const c = await Customer.findOneAndUpdate({ phone }, { name, phone, lastLogin: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const { token } = await startSession('customer', c, req);
  res.json({ ...publicCustomer(c), token });
}));

// ---- Signed-in customer: profile, order tracking and history ----
r.get('/me', customerAuth, wrap(async (req, res) => {
  const spent = await Order.aggregate([{ $match: { phone: req.customer.phone, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total' } } }]);
  res.json({ ...publicCustomer(req.customer), since: req.customer.createdAt, spent: spent[0]?.total || 0 });
}));

r.patch('/me', customerAuth, wrap(async (req, res) => {
  const name = String(req.body.name ?? req.customer.name).trim();
  if (name.length < 2) return res.status(400).json({ message: 'Please enter your name' });
  req.customer.name = name;
  if (req.body.address !== undefined) req.customer.address = String(req.body.address).trim().slice(0, 300);
  await req.customer.save();
  res.json(publicCustomer(req.customer));
}));

r.get('/me/orders', customerAuth, wrap(async (req, res) => {
  const orders = await Order.find({ phone: req.customer.phone }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(orders.map((o) => ({ ...o, no: String(o._id).slice(-5).toUpperCase() })));
}));

r.post('/logout', customerAuth, wrap(async (req, res) => { await Session.findByIdAndDelete(req.sessionId); res.json({ ok: true }); }));

// ---- Admin ----
r.get('/', auth, wrap(async (req, res) => {
  const [list, stats, sess] = await Promise.all([
    Customer.find().sort({ createdAt: -1 }).lean(),
    Order.aggregate([{ $group: { _id: '$phone', orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } } } }]),
    Session.aggregate([{ $match: { kind: 'customer' } }, { $group: { _id: '$customer', devices: { $sum: 1 } } }]),
  ]);
  const by = Object.fromEntries(stats.map((s) => [s._id, s]));
  const dev = Object.fromEntries(sess.map((s) => [String(s._id), s.devices]));
  res.json(list.map((c) => ({ ...c, orders: by[c.phone]?.orders || 0, spent: by[c.phone]?.spent || 0, devices: dev[String(c._id)] || 0 })));
}));

// Block: the customer is logged out of every device right away and cannot sign in or order until unblocked.
r.post('/:id/block', auth, wrap(async (req, res) => {
  const c = await Customer.findByIdAndUpdate(req.params.id, { blocked: true, blockedAt: new Date() }, { new: true });
  if (!c) return res.status(404).json({ message: 'Not found' });
  await Session.deleteMany({ kind: 'customer', customer: c._id });
  res.json(c);
}));
r.post('/:id/unblock', auth, wrap(async (req, res) => {
  const c = await Customer.findByIdAndUpdate(req.params.id, { blocked: false, $unset: { blockedAt: 1 } }, { new: true });
  if (!c) return res.status(404).json({ message: 'Not found' });
  res.json(c);
}));

r.patch('/:id', auth, wrap(async (req, res) => {
  const data = {};
  if (req.body.name !== undefined) data.name = String(req.body.name).trim();
  if (req.body.address !== undefined) data.address = String(req.body.address).trim();
  if (req.body.phone !== undefined) {
    const p = normalizePhone(req.body.phone);
    if (!p) return res.status(400).json({ message: 'Enter a valid phone number' });
    data.phone = p;
  }
  const c = await Customer.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!c) return res.status(404).json({ message: 'Not found' });
  res.json(c);
}));

r.delete('/:id', auth, wrap(async (req, res) => {
  await Promise.all([Customer.findByIdAndDelete(req.params.id), Session.deleteMany({ kind: 'customer', customer: req.params.id })]);
  res.json({ ok: true });
}));

module.exports = r;
