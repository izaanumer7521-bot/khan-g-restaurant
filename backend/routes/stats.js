const r = require('express').Router();
const { Order, Message, MenuItem, Customer } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');

const TZ = 'Asia/Karachi';
const DAYS = 14;
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); // YYYY-MM-DD

r.get('/', auth, wrap(async (req, res) => {
  const since = new Date(Date.now() - (DAYS + 1) * 24 * 60 * 60 * 1000);
  const [orders, pendingOrders, unreadMessages, dishes, rev, recent, customers, blocked, daily, joined, byStatus, top, byType] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Message.countDocuments({ read: false }),
    MenuItem.countDocuments(),
    Order.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.find().sort({ createdAt: -1 }).limit(5),
    Customer.countDocuments(),
    Customer.countDocuments({ blocked: true }),
    Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, orders: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } } } },
    ]),
    Customer.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } }, { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, amount: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { qty: -1 } }, { $limit: 5 },
    ]),
    Order.aggregate([{ $group: { _id: { t: '$type', p: '$paymentMethod' }, n: { $sum: 1 } } }]),
  ]);

  // one entry per day for the last 14 days (empty days are zero)
  const d = Object.fromEntries(daily.map((x) => [x._id, x]));
  const j = Object.fromEntries(joined.map((x) => [x._id, x.n]));
  const series = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const k = dayKey(date);
    series.push({ date: k, label: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' }).format(date),
      orders: d[k]?.orders || 0, done: d[k]?.done || 0, revenue: d[k]?.revenue || 0, customers: j[k] || 0 });
  }
  const pay = { cod: 0, advance: 0, delivery: 0, pickup: 0 };
  byType.forEach((x) => { const t = x._id.t || 'delivery'; pay[t] = (pay[t] || 0) + x.n; pay[x._id.p || 'cod'] = (pay[x._id.p || 'cod'] || 0) + x.n; });

  res.json({
    orders, pendingOrders, unreadMessages, dishes, revenue: rev[0]?.total || 0, recent,
    customers, blocked, series,
    byStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.n])),
    top: top.map((x) => ({ name: x._id, qty: x.qty, amount: x.amount })),
    mix: pay,
  });
}));

module.exports = r;
