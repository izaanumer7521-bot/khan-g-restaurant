import { useEffect, useState } from 'react';
import { readState, turnOn, turnOff, sendTest } from '../lib/alerts.js';

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

  useEffect(() => { readState().then(setState).catch((e) => { setState('off'); setMsg({ ok: false, text: e.message }); }); }, []);

  const flip = async () => {
    if (busy || state === 'loading') return;
    setBusy(true); setMsg({ ok: true, text: '' });
    try { setState(state === 'on' ? await turnOff() : await turnOn()); }
    catch (e) { setMsg({ ok: false, text: e.message || 'Could not change alerts' }); }
    setBusy(false);
  };
  const test = async () => {
    setMsg({ ok: true, text: 'Sending…' });
    try { await sendTest(); setMsg({ ok: true, text: 'Test sent. It should arrive in a few seconds.' }); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
  };

  const on = state === 'on';
  const inner = (
    <>
      <div className="atoggle">
        <div className="atoggle-txt"><strong>Order alerts on this device</strong><small>{on ? 'On: new orders ring this phone' : state === 'loading' ? 'Checking…' : 'Off'}</small></div>
        <button type="button" role="switch" aria-checked={on} aria-label="Order alerts on this device" className={'switch' + (on ? ' on' : '')} disabled={busy || state === 'loading' || !!HINT[state]} onClick={flip}><i /></button>
      </div>
      {HINT[state] && <p className="muted atoggle-hint">{HINT[state]}</p>}
      {msg.text && <p className={msg.ok ? 'okmsg' : 'err'} style={{ marginTop: 8 }}>{msg.text}</p>}
      {on && <button type="button" className="link" style={{ marginTop: 6 }} onClick={test}>Send test alert</button>}
    </>
  );
  return card ? <div className="gcard" style={{ maxWidth: 560 }}>{inner}</div> : <div className="atoggle-wrap">{inner}</div>;
}
