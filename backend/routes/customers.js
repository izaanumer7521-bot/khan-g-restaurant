const r = require('express').Router();
const { Customer, Order } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const normalizePhone = require('../lib/phone');

// Customer "sign in": name + phone are both required. No password; it just saves/updates the customer.
r.post('/signin', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = normalizePhone(req.body.phone);
  if (name.length < 2) return res.status(400).json({ message: 'Please enter your name' });
  if (!phone) return res.status(400).json({ message: 'Please enter a valid phone number, e.g. 0309 6313398' });
  const c = await Customer.findOneAndUpdate({ phone }, { name, phone, lastLogin: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ name: c.name, phone: c.phone, address: c.address });
}));

// Admin: all customers with how many orders they placed
r.get('/', auth, wrap(async (req, res) => {
  const [list, stats] = await Promise.all([
    Customer.find().sort({ createdAt: -1 }).lean(),
    Order.aggregate([{ $group: { _id: '$phone', orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } } } }]),
  ]);
  const by = Object.fromEntries(stats.map((s) => [s._id, s]));
  res.json(list.map((c) => ({ ...c, orders: by[c.phone]?.orders || 0, spent: by[c.phone]?.spent || 0 })));
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

r.delete('/:id', auth, wrap(async (req, res) => { await Customer.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

module.exports = r;
