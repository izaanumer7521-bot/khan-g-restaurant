// Turns a User-Agent string into a short label like "Chrome on Android".
function deviceName(ua = '') {
  ua = String(ua);
  const os = /iPhone/i.test(ua) ? 'iPhone' : /iPad/i.test(ua) ? 'iPad' : /Android/i.test(ua) ? 'Android'
    : /Windows/i.test(ua) ? 'Windows' : /Mac OS X|Macintosh/i.test(ua) ? 'Mac' : /CrOS/i.test(ua) ? 'Chromebook' : /Linux/i.test(ua) ? 'Linux' : 'Unknown device';
  const br = /Edg\//i.test(ua) ? 'Edge' : /OPR\/|Opera/i.test(ua) ? 'Opera' : /SamsungBrowser/i.test(ua) ? 'Samsung Internet'
    : /Firefox|FxiOS/i.test(ua) ? 'Firefox' : /CriOS|Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : 'Browser';
  return br + ' on ' + os;
}
const clientIp = (req) => String((req.headers['x-forwarded-for'] || req.ip || '')).split(',')[0].trim().slice(0, 64);
module.exports = { deviceName, clientIp };
