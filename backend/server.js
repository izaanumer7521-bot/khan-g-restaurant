require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const wrap = require('./middleware/wrap');

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1); // needed behind Vercel's proxy

app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim()) : '*' }));
app.use(express.json({ limit: '1mb' }));

// Reuse one MongoDB connection across serverless invocations
let conn = null;
const connect = () => {
  if (!conn) {
    conn = mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 }).catch((e) => { conn = null; throw e; });
  }
  return conn;
};
app.use(wrap(async (req, res, next) => { await connect(); next(); }));

app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/images', require('./routes/images'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/stats', require('./routes/stats'));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.json({ name: 'Khan G API', ok: true }));

app.use((err, req, res, next) => {
  console.error(err.message);
  const bad = err.name === 'ValidationError' || err.name === 'CastError' || err.name === 'MulterError';
  res.status(err.status || (bad ? 400 : 500)).json({ message: err.message || 'Server error' });
});

// Local development: node server.js. On Vercel the app is exported instead.
if (require.main === module) {
  connect()
    .then(() => app.listen(PORT, () => console.log('Khan G API running on port ' + PORT)))
    .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
}

module.exports = app;
