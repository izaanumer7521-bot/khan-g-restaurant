// Pakistani numbers are stored as 03XXXXXXXXX; anything else is kept as plain digits (10 to 15 long).
module.exports = function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('0092')) d = '0' + d.slice(4);
  else if (d.startsWith('92') && d.length === 12) d = '0' + d.slice(2);
  else if (d.length === 10 && d.startsWith('3')) d = '0' + d;
  return d.length >= 10 && d.length <= 15 ? d : '';
};
