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
