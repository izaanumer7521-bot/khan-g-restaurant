// The Khan G menu board, typed in item by item.
// Single price: price. Two prices: half/full (or custom size labels).
const FLAVOURS = ['Sulemani', 'White', 'Peshawari', 'Achari', 'Namkeen', 'Black Pepper', 'Green Chilli'];
const HF = (half, full) => [{ label: 'Half', price: half }, { label: 'Full', price: full }];

const karahi = (category, meat, special, regular) => [
  { name: `${meat} Karahi - Special`, description: `${meat} karahi, Special style.`, sizes: HF(...special) },
  ...FLAVOURS.map((f) => ({ name: `${meat} Karahi - ${f}`, description: `${meat} karahi, ${f} style.`, sizes: HF(...regular) })),
].map((d) => ({ ...d, category }));

const one = (category, name, price, description = '') => ({ category, name, price, description });
const two = (category, name, sizes, description = '') => ({ category, name, sizes, description });

const DESI = 'Desi Murgh Karahi';
const items = [
  // ---- Desi Murgh Karahi (one price each)
  one(DESI, 'Desi Murgh Karahi - Khan G Special', 3600, 'Desi murgh karahi, Khan G Special.'),
  ...FLAVOURS.map((f) => one(DESI, `Desi Murgh Karahi - ${f}`, 3400, `Desi murgh karahi, ${f} style.`)),

  // ---- Mutton / Beef / Chicken Karahi (Half / Full)
  ...karahi('Mutton Karahi', 'Mutton', [2150, 4200], [2100, 4000]),
  ...karahi('Beef Karahi', 'Beef', [1400, 2700], [1300, 2500]),
  ...karahi('Chicken Karahi', 'Chicken', [950, 1800], [850, 1600]),
  one('Chicken Karahi', 'Koyla Kabab Karahi', 850, 'Koyla kabab karahi.'),

  // ---- BBQ
  two('BBQ', 'Chicken Piece', [{ label: 'Leg', price: 350 }, { label: 'Chest', price: 400 }], 'Grilled chicken piece. Choose leg or chest.'),
  one('BBQ', 'Kashmiri Boti 5Pcs', 350, '5 pieces.'),
  one('BBQ', 'Achari Boti 5Pcs', 350, '5 pieces.'),
  one('BBQ', 'Anari Boti 5Pcs', 350, '5 pieces.'),
  one('BBQ', 'Kalmi Tikka 6Pcs', 900, '6 pieces.'),
  two('BBQ', 'Gola Kabab', HF(300, 550), 'Gola kabab.'),
  one('BBQ', 'Kabab 4Pcs', 350, '4 pieces.'),
  one('BBQ', 'Reshmi Kabab 4Pcs', 400, '4 pieces.'),
  one('BBQ', 'Full Platter', 3800, 'BBQ full platter.'),
  one('BBQ', 'Half Platter', 1950, 'BBQ half platter.'),

  // ---- Continental & Chinese
  one('Continental & Chinese', 'Cashew Nuts +', 750),
  one('Continental & Chinese', 'Black Pepper + Rice', 700),
  one('Continental & Chinese', 'Manchurian + Rice', 750),
  one('Continental & Chinese', 'Almond + Rice', 750),
  one('Continental & Chinese', 'Penne Pasta White & Red Sauce', 600),
  one('Continental & Chinese', 'Black Pepper Steak', 900),
  one('Continental & Chinese', 'Mushroom Steak', 900),
  one('Continental & Chinese', 'Jalapeno Steak', 900),
  one('Continental & Chinese', 'Mexican Steak', 900),
  one('Continental & Chinese', 'Mix Platter', 1500),

  // ---- Arabic Foods
  one('Arabic Foods', 'Mandi With Rice', 2000),
  one('Arabic Foods', 'Mandi Without Rice', 1500),
  one('Arabic Foods', 'Lebanese Shawarma', 350),
  one('Arabic Foods', 'Falafel Lebanese Shawarma', 450),
  one('Arabic Foods', 'Zinger Burger', 350),
  two('Arabic Foods', 'Broast', [{ label: 'Leg', price: 350 }, { label: 'Chest', price: 400 }], 'Crispy broast. Choose leg or chest.'),
  one('Arabic Foods', 'Mutton Mandi With Rice', 5500, 'Price per kg.'),
  one('Arabic Foods', 'Mutton Mandi Without Rice', 4000, 'Price per kg.'),

  // ---- Sea Foods
  one('Sea Foods', 'Fry Fish', 1100),
  one('Sea Foods', 'Grill Fish', 1200),
  one('Sea Foods', 'Steamed Fish', 1400),
];

const categories = ['Desi Murgh Karahi', 'Mutton Karahi', 'Beef Karahi', 'Chicken Karahi', 'BBQ', 'Continental & Chinese', 'Arabic Foods', 'Sea Foods'];
const featured = new Set(['Desi Murgh Karahi - Khan G Special', 'Mutton Karahi - Special', 'Beef Karahi - Special', 'Chicken Karahi - Special', 'Full Platter', 'Mutton Mandi With Rice']);

// Adds whatever is missing and never changes or duplicates dishes that already exist,
// so your edits, photos and prices in the admin panel are safe. Safe to run many times.
async function importDefaultMenu({ Category, MenuItem }) {
  let newCats = 0, newItems = 0;
  for (let i = 0; i < categories.length; i++) {
    if (!(await Category.findOne({ name: categories[i] }))) { await Category.create({ name: categories[i], order: i }); newCats++; }
  }
  const base = Date.UTC(2024, 0, 1); // old dates: keeps the menu order and avoids the "New" badge
  for (let i = 0; i < items.length; i++) {
    const d = items[i];
    if (await MenuItem.findOne({ name: d.name, category: d.category })) continue;
    const sizes = d.sizes || [];
    await MenuItem.create({
      name: d.name, category: d.category, description: d.description || '',
      sizes, price: sizes.length ? Math.min(...sizes.map((s) => s.price)) : d.price,
      featured: featured.has(d.name), available: true, createdAt: new Date(base + i * 1000),
    });
    newItems++;
  }
  return { categories: newCats, dishes: newItems, total: items.length };
}

module.exports = { importDefaultMenu, items, categories };
