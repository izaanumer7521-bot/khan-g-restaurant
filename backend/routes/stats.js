const r = require('express').Router();
const { Order, Reservation, Message, MenuItem } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');

r.get('/', auth, wrap(async (req, res) => {
  const [orders, pendingOrders, reservations, pendingReservations, unreadMessages, dishes, rev, recent] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Reservation.countDocuments(),
    Reservation.countDocuments({ status: 'pending' }),
    Message.countDocuments({ read: false }),
    MenuItem.countDocuments(),
    Order.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.find().sort({ createdAt: -1 }).limit(5),
  ]);
  res.json({ orders, pendingOrders, reservations, pendingReservations, unreadMessages, dishes, revenue: rev[0]?.total || 0, recent });
}));

module.exports = r;
