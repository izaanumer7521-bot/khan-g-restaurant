const r = require('express').Router();
const { Category, MenuItem } = require('../models');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');

const clean = (v) => String(v || '').trim();
const dup = (e, res) => (e && e.code === 11000 ? res.status(400).json({ message: 'A category with that name already exists' }) : null);

r.get('/', wrap(async (req, res) => res.json(await Category.find().sort({ order: 1, createdAt: 1 }))));

r.post('/', auth, wrap(async (req, res) => {
  const name = clean(req.body.name);
  if (!name) return res.status(400).json({ message: 'Enter a category name' });
  try {
    res.status(201).json(await Category.create({ name, order: await Category.countDocuments() }));
  } catch (e) { if (!dup(e, res)) throw e; }
}));

// Rename: dishes in the category follow the new name
r.patch('/:id', auth, wrap(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.status(404).json({ message: 'Not found' });
  const name = clean(req.body.name);
  if (!name) return res.status(400).json({ message: 'Enter a category name' });
  const old = cat.name;
  cat.name = name;
  try { await cat.save(); } catch (e) { if (dup(e, res)) return; throw e; }
  if (old !== name) await MenuItem.updateMany({ category: old }, { category: name });
  res.json(cat);
}));

r.delete('/:id', auth, wrap(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.json({ ok: true });
  const n = await MenuItem.countDocuments({ category: cat.name });
  if (n) return res.status(400).json({ message: `${n} dish${n > 1 ? 'es are' : ' is'} still in "${cat.name}". Move or delete them first.` });
  await cat.deleteOne();
  res.json({ ok: true });
}));

module.exports = r;
