import { useEffect, useState } from 'react';

// The browser fires "beforeinstallprompt" once, early. Catch it here so any button can use it later.
let deferred = null;
const subs = new Set();
const ping = () => subs.forEach((f) => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; ping(); });
  window.addEventListener('appinstalled', () => { deferred = null; ping(); });
}

export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); return () => subs.delete(f); }, []);
  return {
    installed: isStandalone(),
    canPrompt: !!deferred,
    ios: isIOS() && !isStandalone(),
    install: async () => {
      if (!deferred) return 'none';
      deferred.prompt();
      const r = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
      deferred = null; ping();
      return r.outcome;
    },
  };
}

// Shown when the browser gives no one-click install: step-by-step for the device in use
export function IosHelp({ onClose, name = 'Khan G' }) {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const edge = /edg\//i.test(ua);
  const firefox = /firefox/i.test(ua);
  let steps;
  if (ios) steps = ['Open this page in <b>Safari</b> (not inside Instagram or WhatsApp).', 'Tap the <b>Share</b> button (square with an arrow).', 'Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.'];
  else if (android) steps = ['Open this page in <b>Chrome</b>.', 'Tap the <b>⋮</b> menu (top right).', 'Tap <b>Install app</b> (or <b>Add to Home screen</b>), then <b>Install</b>.'];
  else if (firefox) steps = ['Firefox on a computer cannot install apps.', 'Open this page in <b>Chrome</b> or <b>Edge</b> and follow the steps there.'];
  else if (edge) steps = ['Click the <b>⋯</b> menu (top right).', 'Choose <b>Apps</b>, then <b>Install this site as an app</b>.', 'Click <b>Install</b>.'];
  else steps = ['Look at the right end of the address bar for the <b>install icon</b> (a screen with a down arrow) and click it.', 'Or open the <b>⋮</b> menu, then <b>Save and share</b> (or <b>Cast, save and share</b>), then <b>Install page as app</b>.', 'Click <b>Install</b>.'];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={'Install ' + name}>
        <div className="drawer-h"><h3>Install {name}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>
        <ol className="ios-steps">{steps.map((t, i) => <li key={i} dangerouslySetInnerHTML={{ __html: t }} />)}</ol>
        <button className="btn full" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

export function InstallButton({ label = 'Install app', className = 'btn ghost sm', name, always = false }) {
  const { installed, canPrompt, ios, install } = useInstall();
  const [help, setHelp] = useState(false);
  if (installed || (!always && !canPrompt && !ios)) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => (canPrompt ? install() : setHelp(true))}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" /></svg>
        {label}
      </button>
      {help && <IosHelp onClose={() => setHelp(false)} name={name} />}
    </>
  );
}

// Small friendly strip at the bottom of the website on phones, shown once until closed
export function InstallBanner() {
  const { installed, canPrompt, ios, install } = useInstall();
  const [show, setShow] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    let off = false;
    try { if (localStorage.getItem('kg_install_hide')) return; } catch { /* ignore */ }
    const t = setTimeout(() => { if (!off) setShow(true); }, 7000);
    return () => { off = true; clearTimeout(t); };
  }, []);
  const close = () => { setShow(false); try { localStorage.setItem('kg_install_hide', '1'); } catch { /* ignore */ } };
  if (!show || installed || (!canPrompt && !ios)) return null;
  return (
    <>
      <div className="install-banner" role="region" aria-label="Install the app">
        <img src="/icon-192.png" alt="" width="44" height="44" />
        <div className="grow"><strong>Get the Khan G app</strong><span>Order faster, right from your home screen.</span></div>
        <button className="btn sm" onClick={() => (canPrompt ? install().then(close) : setHelp(true))}>Install</button>
        <button className="x" onClick={close} aria-label="Not now">×</button>
      </div>
      {help && <IosHelp onClose={() => { setHelp(false); close(); }} />}
    </>
  );
}
