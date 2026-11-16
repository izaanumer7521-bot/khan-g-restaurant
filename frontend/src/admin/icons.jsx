// Small line icons (24x24) used by the admin sidebar and dashboard cards.
const P = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>,
  orders: <><path d="M6 3h12l1 4H5l1-4Z" /><path d="M5 7h14v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7Z" /><path d="M9 11h6" /></>,
  menu: <><path d="M4 4v7a3 3 0 0 0 3 3v7" /><path d="M7 4v6" /><path d="M10 4v7a3 3 0 0 1-3 3" /><path d="M17 4c-2 1.5-3 4-3 7h3v10" /></>,
  categories: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  customers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></>,
  devices: <><rect x="2.5" y="4" width="14" height="10" rx="2" /><path d="M6 18h7" /><path d="M9.5 14v4" /><rect x="18" y="8" width="3.5" height="9" rx="1.2" /></>,
  messages: <><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  money: <><path d="M12 3v18" /><path d="M16.5 7.5C16 6 14.3 5 12 5c-2.6 0-4.5 1.2-4.5 3s1.6 2.5 4.5 3.2c2.9.7 4.5 1.4 4.5 3.3 0 1.8-1.9 3-4.5 3-2.4 0-4.2-1-4.7-2.6" /></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  phone: <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></>,
  chat: <><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.7-5A8.5 8.5 0 1 1 21 12Z" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  bell: <><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17Z" /><path d="M10 21h4" /></>,
};
export default function Icon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>;
}
