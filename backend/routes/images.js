const r = require('express').Router();
const { Image } = require('../models');
const wrap = require('../middleware/wrap');

r.get('/:id', wrap(async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).end();
  res.set('Content-Type', img.contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(img.data);
}));

module.exports = r;
