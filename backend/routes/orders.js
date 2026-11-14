const { Order, MenuItem } = require('../models');
const wrap = require('../middleware/wrap');
const factory = require('./factory');

const create = wrap(async (req, res) => {
  const { customerName, phone, address, type, note, items } = req.body;
  if (!customerName || !phone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Name, phone and at least one item are required' });
  }
  if (type !== 'pickup' && !address) return res.status(400).json({ message: 'Please enter a delivery address' });

  const dbItems = await MenuItem.find({ _id: { $in: items.map((i) => i.id) }, available: true });
  const lines = [];
  let total = 0;
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
    total += price * qty;
  }
  const order = await Order.create({
    customerName, phone, address, note, items: lines, total,
    type: type === 'pickup' ? 'pickup' : 'delivery',
  });
  res.status(201).json({ _id: order._id, total });
});

module.exports = factory(Order, { create, patchFields: ['status'] });
