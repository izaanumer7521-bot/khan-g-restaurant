require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

// Creates (or resets) the admin login only. It does NOT add any dishes or sample data.
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!email || !process.env.ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first');
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  await User.findOneAndUpdate({ email }, { name: 'Admin', email, password: hash }, { upsert: true });
  console.log('Admin login ready: ' + email);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
