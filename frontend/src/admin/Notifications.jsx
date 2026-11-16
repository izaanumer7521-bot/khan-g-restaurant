import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { syncPush, turnOffPush, pushSupported, repairPush, currentEndpoint, registerCurrent, getDeviceId, getLastReg } from '../lib/push.js';
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
const hostOf = (u) => { try { return new URL(u).host; } catch { return 'unknown'; } };
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const icon = (d) => (/iPhone|Android|iPad/.test(d) ? '📱' : '💻');

export default function Notifications() {
  const [st, setSt] = useState('checking'); // on | off | denied | unsupported | server-off | checking
  const [info, setInfo] = useState(null);
  const [mine, setMine] = useState('');
  const [note, setNote] = useState({ ok: true, text: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    let i = null; let ep = '';
    try { i = await api('/push/status'); setInfo(i); } catch { /* shown as loading */ }
    try { ep = await currentEndpoint(); setMine(ep); } catch { /* ignore */ }
    return { i, ep };
  }, []);
  // On open: register this device, then check the server really has it. If it does not, register it again automatically.
  useEffect(() => {
    let alive = true;
    (async () => {
      let s;
      try { s = await syncPush(false); } catch (e) { s = 'error'; setNote({ ok: false, text: 'Could not register this device: ' + e.message }); }
      if (!alive) return;
      setSt(s);
      let { i, ep } = await load();
      if (alive && s === 'on' && i && ep && !i.devices.some((d) => d.endpoint === ep)) {
        try { await registerCurrent(); ({ i, ep } = await load()); }
        catch (e) { if (alive) { setSt('error'); setNote({ ok: false, text: 'The server did not accept this device: ' + e.message }); } }
      }
    })();
    return () => { alive = false; };
  }, [load]);

  const run = async (fn) => { setBusy(true); setNote({ ok: true, text: '' }); try { await fn(); } catch (e) { setSt('error'); setNote({ ok: false, text: e.message }); } setBusy(false); await load(); };
  const turnOn = () => run(async () => { unlockAudio(); chime(); setSt(await syncPush(true)); });
  const repair = () => run(async () => { unlockAudio(); setSt(await repairPush()); setNote({ ok: true, text: 'This device was registered again. Press “Send test alert” to confirm.' }); });
  const turnOff = () => run(async () => { await turnOffPush(); setSt('off'); });
  const removeDevice = (d) => {
    if (!window.confirm(`Unregister ${d.device}?\n\nIt will stop receiving order alerts until you turn alerts on there again.`)) return;
    run(async () => { await api('/push/devices/' + d.id, { method: 'DELETE' }); if (d.endpoint === mine) { await turnOffPush().catch(() => {}); setSt('off'); } });
  };
  const cleanup = () => run(async () => { const r = await api('/push/cleanup', { method: 'POST' }); setNote({ ok: true, text: `Removed ${r.removed} broken registration${r.removed === 1 ? '' : 's'}.` }); });
  // The phone confirms receipt by itself (sw.js). Wait for that proof instead of trusting "accepted by Google".
  const waitAck = async (rowId, since) => {
    for (let k = 0; k < 5; k++) {
      await new Promise((r) => setTimeout(r, 1500));
      let s2; try { s2 = await api('/push/status'); } catch { continue; }
      setInfo(s2);
      const d = s2.devices.find((x) => x.id === rowId);
      if (d && d.lastAckAt && new Date(d.lastAckAt).getTime() >= since) return true;
    }
    return false;
  };
  const sendTest = async (id) => { const since = Date.now() - 3000; const r = await api('/push/test', { method: 'POST', body: id ? { id } : {} }); return { r, since }; };
  const test = (id) => run(async () => {
    unlockAudio(); chime();
    let { r, since } = await sendTest(id);
    const bad = (r.results || []).filter((x) => !x.ok);
    const problems = bad.map((x) => `${x.device}: ${x.error}`).join(' · ');
    if (r.reason) return setNote({ ok: false, text: r.reason });
    if (!r.devices) return setNote({ ok: false, text: 'No device is registered for alerts yet. Turn on alerts on this device first.' });
    if (!id) return setNote({ ok: !bad.length, text: `Test sent to ${r.sent} of ${r.devices} device${r.devices === 1 ? '' : 's'}.` + (bad.length ? ' Problem: ' + problems : ' Open the list below to see which phones confirmed receiving it.') });
    if (bad.length) return setNote({ ok: false, text: 'Problem: ' + problems });
    setNote({ ok: true, text: 'Test sent. Waiting for the phone to confirm it received it…' });
    if (await waitAck(id, since)) return setNote({ ok: true, text: '✓ Confirmed: this phone received the test alert.' });
    if (!(me && me.id === id)) return setNote({ ok: false, text: 'Google accepted the test but that device did not confirm. Open the admin app on that device and press Repair there.' });
    // Google accepted it but this phone never got it, so the saved registration is stale. Register fresh and test once more.
    setNote({ ok: true, text: 'Google accepted the test but this phone did not receive it, so its saved registration was stale. Registering this phone again…' });
    setSt(await repairPush());
    const reg = getLastReg();
    if (!reg) return setNote({ ok: false, text: 'Could not register this phone again. Check the Technical details below.' });
    ({ r, since } = await sendTest(reg.id));
    if (await waitAck(reg.id, since)) return setNote({ ok: true, text: '✓ Fixed. This phone registered again and received the test alert.' });
    return setNote({ ok: false, text: 'Registered again and Google accepted the test, but this phone still did not receive it. The phone is blocking background alerts for Chrome. Follow the battery steps in the tips below.' });
  });

  const devices = info ? info.devices : [];
  const logs = info ? info.logs || [] : [];
  const broken = devices.filter((d) => /^(Device unsubscribed|Registered with an old key)/.test(d.lastError || ''));
  const reg = getLastReg();
  const localEp = mine || (reg ? reg.endpoint : '');
  // find this phone's row by the id the server just gave us, its push address, or its device id
  const me = info ? (devices.find((d) => reg && d.id === reg.id) || devices.find((d) => localEp && d.endpoint === localEp) || devices.find((d) => d.deviceId && d.deviceId === getDeviceId()) || null) : null;
  const needsInstall = isIos() && !isStandalone();

  // one clear headline for this device
  let tone = 'warn'; let ic = '🔕'; let title = 'Checking…'; let text = ''; let action = null;
  if (st === 'checking' || (!info && st !== 'error')) { title = 'Checking this device…'; }
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
  } else if (st === 'error') {
    tone = 'bad'; ic = '⚠️'; title = 'This device could not be registered'; text = 'The exact reason is shown below. Press Try again. If it keeps failing, send me that message.';
    action = <button className="btn" disabled={busy} onClick={repair}>Try again</button>;
  } else if (st === 'on' && !me) {
    ic = '🛠'; title = 'This device needs a quick repair'; text = 'It is allowed to show notifications but is not registered with the server yet.';
    action = <button className="btn" disabled={busy} onClick={repair}>Repair this device</button>;
  } else if (me && me.lastError) {
    tone = 'bad'; ic = '⚠️'; title = 'The last alert did not reach this device'; text = me.lastError;
    action = <button className="btn" disabled={busy} onClick={repair}>Repair this device</button>;
  } else if (!me.lastAckAt) {
    ic = '🔔'; title = 'Registered. Now confirm it works'; text = 'This phone is registered. Press Send test alert: the phone must confirm it received the alert. If it does not, the app repairs the registration by itself.';
    action = <button className="btn" disabled={busy} onClick={() => test(me.id)}>Send test alert</button>;
  } else {
    tone = 'good'; ic = '🔔'; title = 'Order alerts are active'; text = `This phone confirmed receiving an alert ${ago(me.lastAckAt)}. It is notified of every new order and stays registered until you unregister it here, even if you log out.`;
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
          <div className="btns-row">
            {broken.length > 0 && <button className="btn ghost sm danger" disabled={busy} onClick={cleanup}>Remove {broken.length} broken</button>}
            {devices.length > 0 && <button className="btn ghost sm" disabled={busy} onClick={() => test(null)}>Test all devices</button>}
          </div>
        </div>
        {!devices.length && <p className="muted">No device yet.</p>}
        {devices.map((d) => {
          const isMe = d.endpoint === mine || (!!d.deviceId && d.deviceId === getDeviceId());
          return (
            <div className="item" key={d.id}>
              <div className="dev-ic">{icon(d.device)}</div>
              <div className="grow">
                <strong>{d.device}</strong>{isMe && <span className="tag green">This device</span>}
                <div className={d.lastError ? 'err' : 'muted'} style={{ fontSize: '.85rem' }}>
                  {d.lastError ? d.lastError : d.lastAckAt ? `Phone confirmed receiving an alert ${ago(d.lastAckAt)}` : d.lastOkAt ? `Accepted by Google ${ago(d.lastOkAt)}, but the phone has not confirmed receiving it` : 'Not tested yet. Press Test.'}
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

      <div className="gcard" style={{ marginTop: 14 }}>
        <h3>Recent alerts sent by the server</h3>
        <div className="sub">What happened when each new order (or test) was sent. “Delivered” means Google or Apple accepted it for your phone. If it says delivered but nothing shows, the phone itself is blocking it (see the tips below).</div>
        {!logs.length && <p className="muted">Nothing sent yet. New orders and tests will appear here.</p>}
        {logs.map((l) => (
          <div className="item" key={l.id}>
            <div className="grow">
              <strong>{l.title}</strong>{l.kind === 'test' && <span className="tag">Test</span>}
              <div className="muted" style={{ fontSize: '.8rem' }}>{ago(l.at)}</div>
              <div className={l.devices === 0 || l.sent < l.devices ? 'err' : 'okmsg'} style={{ fontSize: '.88rem' }}>
                {l.devices === 0 ? 'No device was registered when this was sent, so nothing could be delivered.' : `Delivered to ${l.sent} of ${l.devices} device${l.devices === 1 ? '' : 's'}${l.pending ? ` (${l.pending} did not answer in time)` : ''}`}
              </div>
              {(l.results || []).filter((r) => !r.ok).map((r, i) => <div key={i} className="muted" style={{ fontSize: '.78rem' }}>{r.device}: {r.error}</div>)}
            </div>
          </div>
        ))}
      </div>

      <details className="gcard tips">
        <summary>Technical details (for troubleshooting)</summary>
        <div className="muted" style={{ marginTop: 10, fontSize: '.85rem', lineHeight: 1.8 }}>
          Browser permission: <b>{typeof Notification !== 'undefined' ? Notification.permission : 'n/a'}</b><br />
          Push registration in this browser: <b>{mine ? 'yes (' + hostOf(mine) + ')' : 'none'}</b><br />
          Server has this registration: <b>{!info ? '…' : me ? 'yes' : 'no'}</b><br />
          Devices registered on server: <b>{info ? devices.length : '…'}</b><br />
          Push keys: <b>{info ? (info.serverReady ? (info.keySource === 'env' ? 'your Vercel keys' : 'automatic keys') : 'problem: ' + info.serverProblem) : '…'}</b><br />
          This browser's push address ends: <b>{localEp ? '…' + localEp.slice(-10) : 'none'}</b><br />
          Server rows: <b>{info ? (devices.map((d) => '…' + (d.endpoint || '').slice(-10) + (d.id === (me && me.id) ? ' (this phone)' : '')).join(', ') || 'none') : '…'}</b><br />
          Service worker controlling page: <b>{pushSupported() && navigator.serviceWorker.controller ? 'yes' : 'no'}</b>
        </div>
      </details>

      <details className="gcard tips">
        <summary>Not getting alerts when the app is closed?</summary>
        <ol className="ios-steps">
          <li>The top card above must say <b>Order alerts are active</b>. If it does not, press its button. Once registered, a device stays registered until you unregister it here.</li>
          <li><b>Install the admin app</b> (Account → App). An installed app is not cleaned up or reset by the browser like a normal tab.</li>
          <li><b>Android:</b> Settings → Apps → Chrome (and Khan G Admin) → Battery → <b>Unrestricted</b>. Keep notifications allowed.</li>
          <li><b>iPhone:</b> Share → Add to Home Screen, open the admin app from the Home Screen, then turn alerts on (iOS 16.4 or newer).</li>
          <li><b>Do not</b> use “Force stop”, “Clear data / storage” or phone cleaner / booster apps on Chrome or Khan G Admin. They delete the alert registration or stop the browser from receiving messages. After doing that, open the admin app and press <b>Turn on alerts</b> again.</li>
          <li><b>Oppo / Realme / OnePlus (ColorOS):</b> Settings → Apps → App management → <b>Chrome</b> → Battery usage → turn on <b>Allow background activity</b> and <b>Allow auto-launch</b>. Do the same for <b>KG Admin</b> if it is listed. Open the recent-apps screen and <b>lock</b> Chrome and KG Admin (pull the card down or tap the lock). Turn off “Sleep standby optimisation” in Battery settings.</li>
          <li><b>Xiaomi, Vivo, Infinix, Tecno:</b> switch <b>Autostart</b> on, set battery to <b>No restrictions</b> for Chrome, and lock the app in the recent-apps screen.</li>
          <li>Settings → Notifications → <b>Chrome</b> and <b>KG Admin</b>: allow notifications, sound, banners and lock-screen notifications. Make sure the phone is not in Silent or Do not disturb mode.</li>
          <li>If a phone shows <b>admin app last opened</b> a long time ago it is still registered. Alerts only fail if the phone's own settings block them.</li>
          <li>A phone that was switched off gets the alert as soon as it is back online (held for 24 hours).</li>
          {pushSupported() ? null : <li>This browser does not support background alerts.</li>}
        </ol>
      </details>
    </>
  );
}
