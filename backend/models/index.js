const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true, required: true },
  password: { type: String, required: true },
}, { timestamps: true }));

const Category = model('Category', new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  order: { type: Number, default: 0 },
}, { timestamps: true }));

const MenuItem = model('MenuItem', new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 }, // lowest price (used when there are no sizes)
  sizes: { type: [new Schema({ label: { type: String, required: true, trim: true }, price: { type: Number, required: true, min: 0 } }, { _id: false })], default: [] },
  category: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  available: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
}, { timestamps: true }));

const Order = model('Order', new Schema({
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  type: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  note: { type: String, default: '' },
  items: [{ name: String, price: Number, qty: Number }],
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'preparing', 'on-the-way', 'completed', 'cancelled'], default: 'pending' },
}, { timestamps: true }));

const Message = model('Message', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true }));

const Image = model('Image', new Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
}, { timestamps: true }));

module.exports = { User, Category, MenuItem, Order, Message, Image };
