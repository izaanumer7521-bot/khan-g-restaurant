const express = require('express');
const { Order, MenuItem, Customer } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const normalizePhone = require('../lib/phone');
const { notifyAdmins } = require('../lib/push');

const DELIVERY_CHARGE = process.env.DELIVERY_CHARGE ? Number(process.env.DELIVERY_CHARGE) : 100;
const STATUSES = ['pending', 'preparing', 'on-the-way', 'completed', 'cancelled'];
const short = (o) => String(o._id).slice(-5).toUpperCase();
const sum = (lines) => lines.reduce((s, l) => s + l.price * l.qty, 0);

const r = express.Router();

// Public: the delivery charge shown at checkout
r.get('/info', (req, res) => res.json({ deliveryCharge: DELIVERY_CHARGE }));

// Admin: newest order, used by the admin panel to raise an alert
r.get('/latest', auth, wrap(async (req, res) => {
  const [last, pending, count] = await Promise.all([Order.findOne().sort({ createdAt: -1 }), Order.countDocuments({ status: 'pending' }), Order.countDocuments()]);
  res.json({ pending, count, last: last ? { _id: last._id, no: short(last), customerName: last.customerName, total: last.total, type: last.type, createdAt: last.createdAt } : null });
}));

// Customer places an order: name, phone and (for delivery) address are all compulsory
r.post('/', wrap(async (req, res) => {
  const { type, note, items } = req.body;
  const customerName = String(req.body.customerName || '').trim();
  const phone = normalizePhone(req.body.phone);
  const address = String(req.body.address || '').trim();
  const isPickup = type === 'pickup';

  if (customerName.length < 2) return res.status(400).json({ message: 'Please enter your name' });
  if (!phone) return res.status(400).json({ message: 'Please enter a valid phone number, e.g. 0309 6313398' });
  if (!isPickup && address.length < 5) return res.status(400).json({ message: 'Please enter your full delivery address' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Your cart is empty' });

  const dbItems = await MenuItem.find({ _id: { $in: items.map((i) => i.id) }, available: true });
  const lines = [];
  for (const i of items) {
    const m = dbItems.find((x) => String(x._id) === String(i.id));
    if (!m) return res.status(400).json({ message: 'An item in your cart is no longer available. Please review your cart.' });
    const qty = Math.min(50, Math.max(1, parseInt(i.qty, 10) || 1));
    let price = m.price;
    let name = m.name;
    if (m.sizes && m.sizes.length) {
      const sz = m.sizes.find((x) => x.label === i.size);
      if (!sz) return res.status(400).json({ message: 'Please choose a size for ' + m.name + ' again.' });
      price = sz.price;
      name = m.name + ' (' + sz.label + ')';
    }
    lines.push({ name, price, qty });
  }
  const subtotal = sum(lines);
  const deliveryCharge = isPickup ? 0 : DELIVERY_CHARGE;
  const order = await Order.create({
    customerName, phone, address: isPickup ? '' : address, note: String(note || '').slice(0, 500), items: lines,
    subtotal, deliveryCharge, total: subtotal + deliveryCharge, type: isPickup ? 'pickup' : 'delivery',
  });

  // Save the customer so the admin sees them in the Customers list
  Customer.findOneAndUpdate({ phone }, { name: customerName, phone, ...(isPickup ? {} : { address }), lastLogin: new Date() }, { upsert: true, setDefaultsOnInsert: true }).catch(() => {});

  // Alert every admin device (works even when the admin app is closed)
  const count = lines.reduce((s, l) => s + l.qty, 0);
  await notifyAdmins({
    title: `New order #${short(order)} · Rs. ${order.total.toLocaleString('en-PK')}`,
    body: `${customerName} · ${count} item${count > 1 ? 's' : ''} · ${isPickup ? 'Pickup' : 'Delivery'}`,
    tag: 'order-' + order._id, url: '/admin/orders', orderId: String(order._id),
  }).catch(() => {});

  res.status(201).json({ _id: order._id, no: short(order), subtotal, deliveryCharge, total: order.total });
}));

r.get('/', auth, wrap(async (req, res) => res.json(await Order.find().sort({ createdAt: -1 }).limit(500))));

// Admin: edit anything on an order (status, customer details, items, prices, delivery charge)
r.patch('/:id', auth, wrap(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const b = req.body;

  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return res.status(400).json({ message: 'Unknown status' });
    order.status = b.status;
  }
  if (b.customerName !== undefined) { if (String(b.customerName).trim().length < 2) return res.status(400).json({ message: 'Customer name is required' }); order.customerName = String(b.customerName).trim(); }
  if (b.phone !== undefined) { const p = normalizePhone(b.phone); if (!p) return res.status(400).json({ message: 'Enter a valid phone number' }); order.phone = p; }
  if (b.type !== undefined) order.type = b.type === 'pickup' ? 'pickup' : 'delivery';
  if (b.address !== undefined) order.address = String(b.address).trim();
  if (b.note !== undefined) order.note = String(b.note).slice(0, 500);
  if (order.type === 'delivery' && String(order.address).length < 5) return res.status(400).json({ message: 'A delivery order needs an address' });

  if (b.items !== undefined) {
    if (!Array.isArray(b.items)) return res.status(400).json({ message: 'Invalid items' });
    const lines = b.items
      .map((i) => ({ name: String(i.name || '').trim(), price: Number(i.price), qty: Math.floor(Number(i.qty)) }))
      .filter((i) => i.name && i.qty > 0);
    if (!lines.length) return res.status(400).json({ message: 'An order needs at least one item. Delete the order instead.' });
    if (lines.some((l) => !Number.isFinite(l.price) || l.price < 0 || l.qty > 999)) return res.status(400).json({ message: 'Check the item prices and quantities' });
    order.items = lines;
  }
  order.subtotal = sum(order.items);
  if (b.deliveryCharge !== undefined) {
    const d = Number(b.deliveryCharge);
    if (!Number.isFinite(d) || d < 0) return res.status(400).json({ message: 'Delivery charge must be 0 or more' });
    order.deliveryCharge = d;
  } else if (b.type !== undefined) {
    order.deliveryCharge = order.type === 'pickup' ? 0 : (order.deliveryCharge || DELIVERY_CHARGE);
  }
  order.total = order.subtotal + (order.deliveryCharge || 0);
  await order.save();
  res.json(order);
}));

r.delete('/:id', auth, wrap(async (req, res) => { await Order.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

module.exports = r;
