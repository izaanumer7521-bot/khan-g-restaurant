const r = require('express').Router();
const { Order, Message, MenuItem } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');

r.get('/', auth, wrap(async (req, res) => {
  const [orders, pendingOrders, unreadMessages, dishes, rev, recent] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Message.countDocuments({ read: false }),
    MenuItem.countDocuments(),
    Order.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.find().sort({ createdAt: -1 }).limit(5),
  ]);
  res.json({ orders, pendingOrders, unreadMessages, dishes, revenue: rev[0]?.total || 0, recent });
}));

module.exports = r;
