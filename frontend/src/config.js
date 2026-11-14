// Edit these details for the client. They appear on the website automatically.
export const SITE = {
  name: 'Khan G',
  phone: '+92 300 0000000',
  whatsapp: '923000000000', // country code + number, no + or spaces
  email: 'hello@khang.pk',
  address: 'Street address, Islamabad, Pakistan',
  mapLink: 'https://maps.google.com/?q=Islamabad',
  hours: [
    ['Breakfast', '7:00 AM to 12:00 PM'],
    ['Lunch and dinner', '12:00 PM to 12:00 AM'],
  ],
  instagram: '#',
  facebook: '#',
};
export const money = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-PK');
