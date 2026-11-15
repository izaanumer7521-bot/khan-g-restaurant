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
    if (!window.confirm(`Unregister ${d.device}?\n\nIt will stop receiving order alerts until you turn alerts on there again.`)) return;
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
    tone = 'good'; ic = '🔔'; title = 'Order alerts are active'; text = `This device is registered and is notified of every new order, even when the app is closed. It stays registered until you unregister it here, even if you log out.`;
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
              {st === 'on' && <button className="btn ghost sm" disabled={busy} onClick={turnOff}>Unregister this device</button>}
            </div>
          )}
        </div>
      </div>
      {note.text && <p className={note.ok ? 'okmsg' : 'err'} style={{ margin: '10px 2px 0' }}>{note.text}</p>}

      <div className="checks">
        <div className={'chk ' + (info ? (info.serverReady ? 'good' : 'bad') : 'off')}><span>Alert server{info && info.serverReady ? (info.keySource === 'env' ? ' · your Vercel keys' : ' · automatic keys') : ''}</span><b>{!info ? '…' : info.serverReady ? 'Ready' : 'Problem'}</b></div>
        <div className={'chk ' + (st === 'on' ? 'good' : 'off')}><span>This device</span><b>{st === 'on' ? 'Allowed' : st === 'denied' ? 'Blocked' : 'Off'}</b></div>
        <div className={'chk ' + (devices.length ? 'good' : 'off')}><span>Registered devices</span><b>{devices.length}</b></div>
      </div>

      <div className="gcard" style={{ marginTop: 14 }}>
        <div className="gcard-h">
          <div><h3>Registered devices</h3><div className="sub">Every device here gets every new order and stays registered until you remove it. Add as many phones and computers as you like: open this page on each one and turn alerts on.</div></div>
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
                <div className="muted" style={{ fontSize: '.78rem' }}>Added {new Date(d.createdAt).toLocaleDateString()} · admin app last opened here {ago(d.openedAt)}</div>
              </div>
              <div className="btns-row">
                <button className="btn ghost sm" disabled={busy} onClick={() => test(d.id)}>Test</button>
                <button className="link danger" disabled={busy} onClick={() => removeDevice(d)}>Unregister</button>
              </div>
            </div>
          );
        })}
      </div>

      <details className="gcard tips">
        <summary>Not getting alerts when the app is closed?</summary>
        <ol className="ios-steps">
          <li>The top card above must say <b>Order alerts are active</b>. If it does not, press its button. Once registered, a device stays registered until you unregister it here.</li>
          <li><b>Install the admin app</b> (Account → App). An installed app is not cleaned up or reset by the browser like a normal tab.</li>
          <li><b>Android:</b> Settings → Apps → Chrome (and Khan G Admin) → Battery → <b>Unrestricted</b>. Keep notifications allowed.</li>
          <li><b>iPhone:</b> Share → Add to Home Screen, open the admin app from the Home Screen, then turn alerts on (iOS 16.4 or newer).</li>
          <li><b>Do not</b> use “Force stop”, “Clear data / storage” or phone cleaner / booster apps on Chrome or Khan G Admin. They delete the alert registration or stop the browser from receiving messages. After doing that, open the admin app and press <b>Turn on alerts</b> again.</li>
          <li>Xiaomi, Oppo, Vivo, Infinix, Tecno, Realme: also switch <b>Autostart</b> on and set battery to <b>No restrictions</b> for Chrome, and lock the app in the recent-apps screen.</li>
          <li>If a phone shows <b>admin app last opened</b> a long time ago it is still registered. Alerts only fail if the phone's own settings block them.</li>
          <li>A phone that was switched off gets the alert as soon as it is back online (held for 24 hours).</li>
          {pushSupported() ? null : <li>This browser does not support background alerts.</li>}
        </ol>
      </details>
    </>
  );
}
