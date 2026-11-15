require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const { Category, MenuItem } = require('./models');
const { importDefaultMenu } = require('./menuData');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const r = await importDefaultMenu({ Category, MenuItem });
  console.log(`Added ${r.categories} categories and ${r.dishes} dishes (menu has ${r.total} dishes in total).`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
