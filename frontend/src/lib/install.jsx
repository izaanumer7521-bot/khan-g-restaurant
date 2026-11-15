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

// iPhone/iPad have no install popup, so we show the two taps instead
export function IosHelp({ onClose, name = 'Khan G' }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Install on iPhone">
        <div className="drawer-h"><h3>Install {name}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>
        <ol className="ios-steps">
          <li>Open this page in <b>Safari</b>.</li>
          <li>Tap the <b>Share</b> button (square with an arrow).</li>
          <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
        </ol>
        <button className="btn full" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

export function InstallButton({ label = 'Install app', className = 'btn ghost sm', name }) {
  const { installed, canPrompt, ios, install } = useInstall();
  const [help, setHelp] = useState(false);
  if (installed || (!canPrompt && !ios)) return null;
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
