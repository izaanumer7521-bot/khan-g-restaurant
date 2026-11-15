const { User } = require('../models');
const { readSession } = require('../lib/sessions');

// Admin only. The token must belong to a live admin session; removing the device in Admin > Devices logs it out.
module.exports = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const got = await readSession(token, 'admin');
    if (!got) return res.status(401).json({ message: 'This device was logged out. Please sign in again.' });
    const user = await User.findById(got.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Not authorized' });
    req.user = user;
    req.sessionId = String(got.session._id);
    next();
  } catch (e) {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
};
