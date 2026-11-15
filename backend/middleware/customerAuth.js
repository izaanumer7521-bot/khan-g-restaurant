const { Customer } = require('../models');
const { readSession } = require('../lib/sessions');

// Customer profile routes. Header: x-customer-token. Fails with 401 if the device was removed, 403 if the customer is blocked.
module.exports = async (req, res, next) => {
  try {
    const token = req.headers['x-customer-token'];
    if (!token) return res.status(401).json({ message: 'Please sign in', code: 'SIGNED_OUT' });
    const got = await readSession(token, 'customer');
    if (!got) return res.status(401).json({ message: 'You were signed out of this device. Please sign in again.', code: 'SIGNED_OUT' });
    const c = await Customer.findById(got.id);
    if (!c) return res.status(401).json({ message: 'Please sign in again', code: 'SIGNED_OUT' });
    if (c.blocked) return res.status(403).json({ message: 'Your account has been blocked. Please call the restaurant.', code: 'BLOCKED' });
    req.customer = c;
    req.sessionId = String(got.session._id);
    next();
  } catch (e) {
    res.status(401).json({ message: 'Please sign in again', code: 'SIGNED_OUT' });
  }
};
