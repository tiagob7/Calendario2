// ============================================================
// Icons (inline SVG components — stroke-based, consistent set)
// ============================================================

const Icon = ({ children, size = 18, stroke = 1.6, className = '', style = {} }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

const I = {
  dashboard: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Icon>,
  tasks: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10l3 3 5-6"/></Icon>,
  megaphone: (p) => <Icon {...p}><path d="M3 11v2a1 1 0 001 1h1l3 5a2 2 0 003-1v-3l8-2V7L11 5H4a1 1 0 00-1 1v5z"/></Icon>,
  calendar: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></Icon>,
  beach: (p) => <Icon {...p}><path d="M12 4v17M4 12l16 0"/><path d="M12 4a6 6 0 00-6 6"/><path d="M12 4a6 6 0 016 6"/></Icon>,
  flag: (p) => <Icon {...p}><path d="M4 4v17"/><path d="M4 5h14l-3 4 3 4H4"/></Icon>,
  users: (p) => <Icon {...p}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0"/><circle cx="17" cy="10" r="3"/><path d="M15 21h7a5 5 0 00-3.5-4.8"/></Icon>,
  receipt: (p) => <Icon {...p}><path d="M5 4h14v17l-2-1-2 1-2-1-2 1-2-1-2 1-2-1V4z"/><path d="M9 9h6M9 13h6"/></Icon>,
  building: (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/></Icon>,
  chat: (p) => <Icon {...p}><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></Icon>,
  settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>,
  bell: (p) => <Icon {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></Icon>,
  help: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9.1 9.1a3 3 0 015.8 1c0 2-3 2-3 4"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  close: (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>,
  check: (p) => <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>,
  chevronDown: (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  chevronRight: (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>,
  chevronLeft: (p) => <Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>,
  chevronUp: (p) => <Icon {...p}><path d="M18 15l-6-6-6 6"/></Icon>,
  arrowRight: (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Icon>,
  arrowUp: (p) => <Icon {...p}><path d="M7 14l5-5 5 5"/></Icon>,
  arrowDown: (p) => <Icon {...p}><path d="M7 10l5 5 5-5"/></Icon>,
  moon: (p) => <Icon {...p}><path d="M21 13A9 9 0 0111 3a7 7 0 1010 10z"/></Icon>,
  sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.4 1.4M17.6 17.6L19 19M2 12h2M20 12h2M5 19l1.4-1.4M17.6 6.4L19 5"/></Icon>,
  menu: (p) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16"/></Icon>,
  filter: (p) => <Icon {...p}><path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/></Icon>,
  sliders: (p) => <Icon {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h14M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></Icon>,
  mail: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></Icon>,
  phone: (p) => <Icon {...p}><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z"/></Icon>,
  book: (p) => <Icon {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></Icon>,
  store: (p) => <Icon {...p}><path d="M3 9l1-5h16l1 5M4 9v11a1 1 0 001 1h14a1 1 0 001-1V9"/><path d="M9 21v-7h6v7"/></Icon>,
  clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  pin: (p) => <Icon {...p}><path d="M12 2a6 6 0 00-6 6c0 6 6 13 6 13s6-7 6-13a6 6 0 00-6-6z"/><circle cx="12" cy="8" r="2.5"/></Icon>,
  paper: (p) => <Icon {...p}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></Icon>,
  trash: (p) => <Icon {...p}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6"/></Icon>,
  edit: (p) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></Icon>,
  moreH: (p) => <Icon {...p}><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></Icon>,
  grip: (p) => <Icon {...p}><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></Icon>,
  logout: (p) => <Icon {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></Icon>,
  upload: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></Icon>,
  send: (p) => <Icon {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></Icon>,
  trendingUp: (p) => <Icon {...p}><path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/></Icon>,
  alert: (p) => <Icon {...p}><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></Icon>,
  check2: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></Icon>,
  star: (p) => <Icon {...p}><path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></Icon>,
  paperclip: (p) => <Icon {...p}><path d="M21 12l-8.5 8.5a5 5 0 01-7-7L14 5a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 8"/></Icon>,
  palette: (p) => <Icon {...p}><path d="M12 2a10 10 0 1010 10c0-3-3-3-5-3h-2a2 2 0 010-4h2c2 0 5 0 5-3 0 0-3-0-5 0"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor"/></Icon>,
  layers: (p) => <Icon {...p}><path d="M12 2l10 6-10 6L2 8l10-6z"/><path d="M2 14l10 6 10-6M2 12l10 6 10-6"/></Icon>,
  shield2: (p) => <Icon {...p}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></Icon>,
};

window.I = I;
