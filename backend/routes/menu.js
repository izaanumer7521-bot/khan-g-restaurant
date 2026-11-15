const r = require('express').Router();
const multer = require('multer');
const { MenuItem, Category, Image } = require('../models');
const { importDefaultMenu } = require('../menuData');
const auth = require('../middleware/auth');
const wrap = require('../middleware/wrap');

// Photos are stored inside MongoDB (Vercel cannot keep files on disk). Vercel limits request size to ~4.5 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (q, f, cb) => (/^image\/(jpeg|png|webp|gif)$/.test(f.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'))),
});

const saveImage = async (file) => {
  const img = await Image.create({ data: file.buffer, contentType: file.mimetype });
  return '/api/images/' + img._id;
};
const dropImage = async (url) => {
  const m = /\/api\/images\/([a-f0-9]{24})$/.exec(url || '');
  if (m) await Image.findByIdAndDelete(m[1]);
};

// sizes arrive as JSON: [{ label: 'Half', price: 900 }, { label: 'Full', price: 1700 }]
const parseSizes = (raw) => {
  try {
    return (JSON.parse(raw || '[]') || [])
      .map((s) => ({ label: String(s.label || '').trim(), price: Number(s.price) }))
      .filter((s) => s.label && Number.isFinite(s.price) && s.price >= 0);
  } catch { return []; }
};

const fromBody = (b) => {
  const sizes = parseSizes(b.sizes);
  return {
  name: b.name,
  description: b.description,
  sizes,
  price: sizes.length ? Math.min(...sizes.map((s) => s.price)) : Number(b.price),
  category: b.category,
  available: b.available !== 'false',
  featured: b.featured === 'true',
  };
};

r.get('/', wrap(async (req, res) => res.json(await MenuItem.find().sort({ createdAt: 1 }))));

r.get('/:id([a-f0-9]{24})', wrap(async (req, res) => {
  const doc = await MenuItem.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Dish not found' });
  res.json(doc);
}));

// One click from the admin panel: loads the full Khan G menu (skips dishes that already exist)
r.post('/import-default', auth, wrap(async (req, res) => res.json(await importDefaultMenu({ Category, MenuItem }))));

r.post('/', auth, upload.single('image'), wrap(async (req, res) => {
  const data = fromBody(req.body);
  if (req.file) data.image = await saveImage(req.file);
  res.status(201).json(await MenuItem.create(data));
}));

r.put('/:id', auth, upload.single('image'), wrap(async (req, res) => {
  const old = await MenuItem.findById(req.params.id);
  if (!old) return res.status(404).json({ message: 'Not found' });
  const data = fromBody(req.body);
  if (req.file) { data.image = await saveImage(req.file); await dropImage(old.image); }
  res.json(await MenuItem.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }));
}));

// quick toggles from the admin list
r.patch('/:id', auth, wrap(async (req, res) => {
  const d = {};
  if (typeof req.body.available === 'boolean') d.available = req.body.available;
  if (typeof req.body.featured === 'boolean') d.featured = req.body.featured;
  const doc = await MenuItem.findByIdAndUpdate(req.params.id, d, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
}));

r.delete('/:id', auth, wrap(async (req, res) => {
  const doc = await MenuItem.findByIdAndDelete(req.params.id);
  if (doc) await dropImage(doc.image);
  res.json({ ok: true });
}));

module.exports = r;
