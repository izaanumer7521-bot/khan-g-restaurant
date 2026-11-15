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
  subtotal: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'preparing', 'on-the-way', 'completed', 'cancelled'], default: 'pending' },
  // cod = cash on delivery/pickup. advance = customer pays the rider online (Easypaisa, JazzCash, bank) when the order arrives.
  paymentMethod: { type: String, enum: ['cod', 'advance'], default: 'cod' },
  paymentType: { type: String, default: '' },
}, { timestamps: true }));

const Customer = model('Customer', new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, unique: true },
  address: { type: String, default: '' },
  lastLogin: { type: Date, default: Date.now },
  blocked: { type: Boolean, default: false },
  blockedAt: Date,
}, { timestamps: true }));

// One row per signed-in browser/phone (customers and the admin). Deleting a row logs that device out.
const Session = model('Session', new Schema({
  kind: { type: String, enum: ['customer', 'admin'], required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  device: { type: String, default: '' },
  ip: { type: String, default: '' },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB removes the row after this time
}, { timestamps: true }));

// One row per browser/phone that turned on order alerts in the admin panel
const PushSub = model('PushSub', new Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: { p256dh: String, auth: String },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  device: { type: String, default: '' },
  lastOkAt: Date,
  lastError: { type: String, default: '' },
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

module.exports = { User, Category, MenuItem, Order, Customer, Session, PushSub, Message, Image };
