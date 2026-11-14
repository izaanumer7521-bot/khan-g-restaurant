const { Reservation } = require('../models');
const wrap = require('../middleware/wrap');
const factory = require('./factory');

const create = wrap(async (req, res) => {
  const { name, phone, date, time, guests, note } = req.body;
  const doc = await Reservation.create({ name, phone, date, time, guests: Number(guests), note });
  res.status(201).json({ _id: doc._id });
});

module.exports = factory(Reservation, { create, patchFields: ['status'] });
