import { SITE } from '../config.js';

const Ig = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const Fb = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7h1.6V3.8c-.3 0-1.3-.2-2.4-.2-2.5 0-4.1 1.5-4.1 4.2v2.7H7.6v3.3h2.8V22h3.1z" />
  </svg>
);
const Wa = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-3.8A8.5 8.5 0 1 1 20 11.5z" />
    <path d="M9.2 8.6c-.3.5-.3 1.3.4 2.5.9 1.5 2.2 2.6 3.7 3.1.8.3 1.4 0 1.7-.5l.2-.6-1.6-.9-.7.6c-.7-.3-1.7-1.2-2-2l.6-.7-.8-1.6-.6.1z" fill="currentColor" stroke="none" />
  </svg>
);

export default function Social({ className = '' }) {
  return (
    <div className={'social ' + className}>
      <a href={SITE.instagram} target="_blank" rel="noreferrer" aria-label="Khan G on Instagram"><Ig /><span>Instagram</span></a>
      <a href={SITE.facebook} target="_blank" rel="noreferrer" aria-label="Khan G on Facebook"><Fb /><span>Facebook</span></a>
      <a href={'https://wa.me/' + SITE.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat with Khan G on WhatsApp"><Wa /><span>WhatsApp</span></a>
    </div>
  );
}
