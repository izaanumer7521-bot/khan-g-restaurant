const r = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');
const { Session } = require('../models');
const { startSession } = require('../lib/sessions');

r.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password || ''), user.password))) {
    return res.status(401).json({ message: 'Wrong email or password' });
  }
  const { token } = await startSession('admin', user, req);
  res.json({ token, user: { name: user.name, email: user.email } });
}));

// Log this device out (removes its session so the token stops working everywhere)
r.post('/logout', auth, wrap(async (req, res) => { await Session.findByIdAndDelete(req.sessionId); res.json({ ok: true }); }));

r.get('/me', auth, (req, res) => res.json({ ...req.user.toObject(), sessionId: req.sessionId }));

// Change the admin email and/or password (needs the current password)
r.patch('/account', auth, wrap(async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(String(currentPassword || ''), user.password))) {
    return res.status(400).json({ message: 'Current password is wrong' });
  }
  const email = String(newEmail || '').trim().toLowerCase();
  if (email && email !== user.email) {
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (await User.findOne({ email })) return res.status(400).json({ message: 'That email is already in use' });
    user.email = email;
  }
  if (newPassword) {
    if (String(newPassword).length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
    user.password = await bcrypt.hash(String(newPassword), 10);
  }
  await user.save();
  res.json({ ok: true, user: { name: user.name, email: user.email } });
}));

module.exports = r;
