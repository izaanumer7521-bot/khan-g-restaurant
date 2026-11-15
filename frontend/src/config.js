// Edit these details for the client. They appear on the website automatically.
export const SITE = {
  name: 'Khan G',
  phone: '+92 309 6313398',
  whatsapp: '923096313398', // country code + number, no + or spaces
  email: 'hello@khang.pk',
  address: 'Fasial Town, Near Jaffaz Food Lounge, Town, Vehari, 61100',
  mapLink: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Fasial Town, Near Jaffaz Food Lounge, Vehari 61100, Pakistan'),
  hours: [
    ['Breakfast', '7:00 AM to 12:00 PM'],
    ['Lunch and dinner', '12:00 PM to 12:00 AM'],
  ],
  instagram: 'https://www.instagram.com/khangresturantvhr',
  facebook: 'https://web.facebook.com/profile.php?id=61595727682971',
};
export const money = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-PK');

// "Advance" payment: the customer pays the rider ONLINE when the order arrives (not before).
// Keep the ids in sync with PAY_TYPES in backend/routes/orders.js.
// Optional: set `account` to the number/IBAN the rider should be paid on. It is shown to the customer only when filled in.
export const PAY_TYPES = [
  { id: 'easypaisa', label: 'Easypaisa', account: '', desc: 'When your order arrives, pay the rider online through Easypaisa and show the payment confirmation on your phone.' },
  { id: 'jazzcash', label: 'JazzCash', account: '', desc: 'When your order arrives, pay the rider online through JazzCash and show the payment confirmation on your phone.' },
  { id: 'bank', label: 'Bank transfer', account: '', desc: 'When your order arrives, pay the rider online by bank transfer (Raast / mobile banking) and show the confirmation on your phone.' },
];
export const payLabel = (id) => (PAY_TYPES.find((p) => p.id === id) || {}).label || id;
