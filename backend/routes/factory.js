const express = require('express');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');

// Admin list/patch/delete + a public create handler
module.exports = (Model, { create, patchFields }) => {
  const r = express.Router();
  r.post('/', create);
  r.get('/', auth, wrap(async (req, res) => res.json(await Model.find().sort({ createdAt: -1 }))));
  r.patch('/:id', auth, wrap(async (req, res) => {
    const data = {};
    patchFields.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const doc = await Model.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  }));
  r.delete('/:id', auth, wrap(async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  }));
  return r;
};
