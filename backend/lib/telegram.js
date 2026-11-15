// Optional backup alert: a Telegram message to the owner for every order.
// Telegram has its own very reliable push, so it rings on any phone even when the admin app is closed.
const token = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_CHAT_ID;
const telegramReady = !!(token && chat);

async function notifyTelegram(text) {
  if (!telegramReady) return { ok: false, reason: 'Telegram is not set up' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.trim(), text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(6000),
    });
    const j = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, reason: j.description || 'Telegram error ' + res.status };
  } catch (e) { return { ok: false, reason: e.message }; }
}

const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function orderText(o, no) {
  const lines = o.items.map((i) => `• ${i.qty}× ${esc(i.name)} — Rs. ${i.price * i.qty}`).join('\n');
  return `🔔 <b>NEW ORDER #${no}</b>\n\n👤 ${esc(o.customerName)}\n📞 ${esc(o.phone)}\n${o.type === 'delivery' ? '📍 ' + esc(o.address) : '🛍 Pickup'}\n\n${lines}\n\nDelivery: Rs. ${o.deliveryCharge || 0}\n<b>Total: Rs. ${o.total}</b>\n💳 ${o.paymentMethod === 'advance' ? 'Pays the rider ONLINE (' + esc(o.paymentType) + ')' : 'Cash'}${o.note ? '\n📝 ' + esc(o.note) : ''}`;
}

module.exports = { notifyTelegram, telegramReady, orderText };
