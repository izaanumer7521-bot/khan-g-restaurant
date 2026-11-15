import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { syncPush, turnOffPush, pushSupported, repairPush, currentEndpoint } from '../lib/push.js';
import { chime, unlockAudio } from '../lib/sound.js';
import { isStandalone } from '../lib/install.jsx';

const ago = (d) => {
  if (!d) return '';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago';
  return Math.round(m / 1440) + ' d ago';
};
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const icon = (d) => (/iPhone|Android|iPad/.test(d) ? '📱' : '💻');

export default function Notifications() {
  const [st, setSt] = useState('checking'); // on | off | denied | unsupported | server-off | checking
  const [info, setInfo] = useState(null);
  const [mine, setMine] = useState('');
  const [note, setNote] = useState({ ok: true, text: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setInfo(await api('/push/status')); } catch { /* shown as loading */ }
    try { setMine(await currentEndpoint()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { syncPush(false).then(setSt).catch(() => setSt('off')).finally(load); }, [load]);

  const run = async (fn) => { setBusy(true); setNote({ ok: true, text: '' }); try { await fn(); } catch (e) { setNote({ ok: false, text: e.message }); } setBusy(false); await load(); };
  const turnOn = () => run(async () => { unlockAudio(); chime(); setSt(await syncPush(true)); });
  const repair = () => run(async () => { unlockAudio(); setSt(await repairPush()); setNote({ ok: true, text: 'This device was registered again. Press “Send test alert” to confirm.' }); });
  const turnOff = () => run(async () => { await turnOffPush(); setSt('off'); });
  const removeDevice = (d) => {
    if (!window.confirm(`Stop order alerts on ${d.device}?`)) return;
    run(async () => { await api('/push/devices/' + d.id, { method: 'DELETE' }); if (d.endpoint === mine) { await turnOffPush().catch(() => {}); setSt('off'); } });
  };
  const test = (id) => run(async () => {
    unlockAudio(); chime();
    const r = await api('/push/test', { method: 'POST', body: id ? { id } : {} });
    const bad = (r.results || []).filter((x) => !x.ok);
    let text;
    if (r.reason) text = r.reason;
    else if (!r.devices) text = 'No device is registered for alerts yet. Turn on alerts on this device first.';
    else text = `Test sent to ${r.sent} of ${r.devices} device${r.devices === 1 ? '' : 's'}.` + (bad.length ? ' Problem: ' + bad.map((x) => `${x.device}: ${x.error}`).join(' · ') : ' Check your notifications now.');
    if (r.telegram) text += r.telegram.ok ? ' Telegram message sent.' : ' Telegram: ' + r.telegram.reason;
    setNote({ ok: !bad.length && !r.reason && !!r.devices, text });
  });

  const devices = info ? info.devices : [];
  const me = info && mine ? devices.find((d) => d.endpoint === mine) : null;
  const needsInstall = isIos() && !isStandalone();

  // one clear headline for this device
  let tone = 'warn'; let ic = '🔕'; let title = 'Checking…'; let text = ''; let action = null;
  if (st === 'checking' || !info) { title = 'Checking this device…'; }
  else if (st === 'unsupported') {
    ic = '📵'; title = needsInstall ? 'Install the admin app first' : 'Alerts are not supported here';
    text = needsInstall ? 'On iPhone, tap Share → Add to Home Screen, then open Khan G Admin from the Home Screen and come back to this page.' : 'This browser cannot receive background notifications. Use Chrome or Edge on Android or a computer.';
  } else if (st === 'denied') {
    tone = 'bad'; ic = '🚫'; title = 'Notifications are blocked'; text = 'Allow notifications for this site in your browser or phone settings (tap the lock icon next to the address, then Notifications → Allow), then reload this page.';
  } else if (st === 'off') {
    title = 'Alerts are off on this device'; text = 'Turn them on to get a notification with sound for every new order, even when the app is closed.';
    action = <button className="btn" disabled={busy} onClick={turnOn}>Turn on alerts</button>;
  } else if (st === 'server-off') {
    tone = 'bad'; ic = '⚠️'; title = 'The server could not prepare alerts'; text = (info.serverProblem || 'Please try again in a minute.');
    action = <button className="btn" disabled={busy} onClick={load}>Check again</button>;
  } else if (st === 'on' && !me) {
    ic = '🛠'; title = 'This device needs a quick repair'; text = 'It is allowed to show notifications but is not registered with the server yet.';
    action = <button className="btn" disabled={busy} onClick={repair}>Repair this device</button>;
  } else if (me && me.lastError) {
    tone = 'bad'; ic = '⚠️'; title = 'The last alert did not reach this device'; text = me.lastError;
    action = <button className="btn" disabled={busy} onClick={repair}>Repair this device</button>;
  } else {
    tone = 'good'; ic = '🔔'; title = 'Order alerts are active'; text = `This device is notified of every new order, even when the app is closed. ${devices.length} device${devices.length === 1 ? '' : 's'} receive alerts.`;
    action = <button className="btn" disabled={busy} onClick={() => test(me.id)}>Send test alert</button>;
  }

  return (
    <>
      <div className={'hero-status ' + tone}>
        <div className="sh-ic" aria-hidden="true">{ic}</div>
        <div className="grow">
          <h3>{title}</h3>
          {text && <p className="muted">{text}</p>}
          {(action || (st === 'on' && me && !me.lastError)) && (
            <div className="btns-row" style={{ marginTop: 12 }}>
              {action}
              {st === 'on' && me && !me.lastError && <button className="btn ghost sm" disabled={busy} onClick={repair}>Repair</button>}
              {st === 'on' && <button className="btn ghost sm" disabled={busy} onClick={turnOff}>Turn off on this device</button>}
            </div>
          )}
        </div>
      </div>
      {note.text && <p className={note.ok ? 'okmsg' : 'err'} style={{ margin: '10px 2px 0' }}>{note.text}</p>}

      <div className="checks">
        <div className={'chk ' + (info ? (info.serverReady ? 'good' : 'bad') : 'off')}><span>Alert server</span><b>{!info ? '…' : info.serverReady ? 'Ready' : 'Problem'}</b></div>
        <div className={'chk ' + (st === 'on' ? 'good' : 'off')}><span>This device</span><b>{st === 'on' ? 'Allowed' : st === 'denied' ? 'Blocked' : 'Off'}</b></div>
        <div className={'chk ' + (info && info.telegram ? 'good' : 'off')}><span>Telegram backup</span><b>{info && info.telegram ? 'On' : 'Not set (optional)'}</b></div>
      </div>

      <div className="gcard" style={{ marginTop: 14 }}>
        <div className="gcard-h">
          <div><h3>Devices that get order alerts</h3><div className="sub">Add as many phones and computers as you like. Open this page on each one and turn alerts on.</div></div>
          {devices.length > 0 && <button className="btn ghost sm" disabled={busy} onClick={() => test(null)}>Test all devices</button>}
        </div>
        {!devices.length && <p className="muted">No device yet.</p>}
        {devices.map((d) => {
          const isMe = d.endpoint === mine;
          return (
            <div className="item" key={d.id}>
              <div className="dev-ic">{icon(d.device)}</div>
              <div className="grow">
                <strong>{d.device}</strong>{isMe && <span className="tag green">This device</span>}
                <div className={d.lastError ? 'err' : 'muted'} style={{ fontSize: '.85rem' }}>
                  {d.lastError ? d.lastError : d.lastOkAt ? `Last alert delivered ${ago(d.lastOkAt)}` : 'Not tested yet. Press Test.'}
                </div>
                <div className="muted" style={{ fontSize: '.78rem' }}>Added {new Date(d.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="btns-row">
                <button className="btn ghost sm" disabled={busy} onClick={() => test(d.id)}>Test</button>
                <button className="link danger" disabled={busy} onClick={() => removeDevice(d)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      <details className="gcard tips">
        <summary>Not getting alerts when the app is closed?</summary>
        <ol className="ios-steps">
          <li>The top card above must say <b>Order alerts are active</b>. If it does not, press its button.</li>
          <li><b>Android:</b> Settings → Apps → Chrome (and Khan G Admin) → Battery → <b>Unrestricted</b>. Keep notifications allowed.</li>
          <li><b>iPhone:</b> Share → Add to Home Screen, open the admin app from the Home Screen, then turn alerts on (iOS 16.4 or newer).</li>
          <li>Swipe the app away normally. Do not “Force stop” it.</li>
          <li>A phone that was switched off gets the alert as soon as it is back online (held for 24 hours).</li>
          {pushSupported() ? null : <li>This browser does not support background alerts.</li>}
        </ol>
      </details>
    </>
  );
}
