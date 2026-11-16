import { useEffect, useState } from 'react';
import { readState, turnOn, turnOff, sendTest, getInfo } from '../lib/alerts.js';

const HINT = {
  'ios-install': 'On iPhone: tap Share → Add to Home Screen, then open Khan G Admin from the Home Screen and switch this on.',
  blocked: 'Notifications are blocked. Allow them for this app in the phone settings, then switch this on.',
  unsupported: 'This browser cannot receive background alerts. Use Chrome on Android or the installed app.',
};

// One switch: "Order alerts on this device".
export default function AlertToggle({ card = false }) {
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: true, text: '' });
  const [info, setInfo] = useState(null);
  const refresh = () => getInfo().then(setInfo).catch(() => {});
  useEffect(() => { if (state === 'on') refresh(); }, [state]);

  useEffect(() => { readState().then(setState).catch((e) => { setState('off'); setMsg({ ok: false, text: e.message }); }); }, []);

  const flip = async () => {
    if (busy || state === 'loading') return;
    setBusy(true); setMsg({ ok: true, text: '' });
    try { setState(state === 'on' ? await turnOff() : await turnOn()); }
    catch (e) { setMsg({ ok: false, text: e.message || 'Could not change alerts' }); }
    setBusy(false);
  };
  const test = async (delay = 0) => {
    setMsg({ ok: true, text: delay ? `Close the app and lock the phone now. The alert is sent in ${delay} seconds…` : 'Sending…' });
    try { await sendTest(delay); setMsg({ ok: true, text: 'Test sent. It should arrive in a few seconds.' }); refresh(); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const when = (d) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const on = state === 'on';
  const inner = (
    <>
      <div className="atoggle">
        <div className="atoggle-txt"><strong>Order alerts on this device</strong><small>{on ? 'On: new orders ring this phone' : state === 'loading' ? 'Checking…' : 'Off'}</small></div>
        <button type="button" role="switch" aria-checked={on} aria-label="Order alerts on this device" className={'switch' + (on ? ' on' : '')} disabled={busy || state === 'loading' || !!HINT[state]} onClick={flip}><i /></button>
      </div>
      {HINT[state] && <p className="muted atoggle-hint">{HINT[state]}</p>}
      {msg.text && <p className={msg.ok ? 'okmsg' : 'err'} style={{ marginTop: 8 }}>{msg.text}</p>}
      {on && info && <p className="muted atoggle-hint">{info.lastError ? `Last alert FAILED: ${info.lastError}` : info.lastSentAt ? `Last alert sent to this phone: ${when(info.lastSentAt)}` : 'No alert sent to this phone yet.'}</p>}
      {on && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
          <button type="button" className="link" onClick={() => test(0)}>Send test alert</button>
          <button type="button" className="link" onClick={() => test(6)}>Test with app closed</button>
        </div>
      )}
    </>
  );
  return card ? <div className="gcard" style={{ maxWidth: 560 }}>{inner}</div> : <div className="atoggle-wrap">{inner}</div>;
}
