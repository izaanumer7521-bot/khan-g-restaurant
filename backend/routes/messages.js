const { Message } = require('../models');
const wrap = require('../middleware/wrap');
const factory = require('./factory');

const create = wrap(async (req, res) => {
  const { name, email, phone, message } = req.body;
  const doc = await Message.create({ name, email, phone, message });
  res.status(201).json({ _id: doc._id });
});

module.exports = factory(Message, { create, patchFields: ['read'] });
