// Shared navigation config + inline SVG icons
const I = (path) => (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{path}</svg>
)

export const ICONS = {
  dash: I(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  upload: I(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>),
  daybook: I(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>),
  deposits: I(<><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20" /><circle cx="12" cy="14.5" r="1.5" /></>),
  profitsplit: I(<><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>),
  purchases: I(<><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></>),
  expenses: I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  suspense: I(<><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.17a2 2 0 00-.59-1.42L12 12l-4.41 4.41A2 2 0 007 17.83V22" /><path d="M7 2v4.17a2 2 0 00.59 1.42L12 12l4.41-4.41A2 2 0 0017 6.17V2" /></>),
  records: I(<><path d="M4 4h16v4H4z" /><path d="M4 10h16v10H4z" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="17" x2="13" y2="17" /></>),
  profit: I(<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></>),
  reports: I(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></>),
  settings: I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 01-4 0v-.09A1.65 1.65 0 007 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 14H4.5a2 2 0 010-4h.09A1.65 1.65 0 006 7a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 0010 4.6V4.5a2 2 0 014 0v.09a1.65 1.65 0 002.82 1.17 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 10v.09a1.65 1.65 0 001.17 2.82h.09a2 2 0 010 4h-.09a1.65 1.65 0 00-1.17.18z" /></>),
  more: I(<><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>),
}

export const PAGES = [
  { id: 'dash', label: 'Dashboard', title: 'Dashboard', section: 'Main' },
  { id: 'upload', label: 'Upload Report', title: 'Upload Daily Report', section: 'Main' },
  { id: 'daybook', label: 'Day Book', title: 'Day Book', section: 'Main' },
  { id: 'purchases', label: 'Purchases', title: 'Purchases', section: 'Money' },
  { id: 'expenses', label: 'Expenses', title: 'Expenses', section: 'Money' },
  { id: 'deposits', label: 'Bank Deposit', title: 'Bank Deposit', section: 'Money' },
  { id: 'profitsplit', label: 'Profit Split', title: 'Profit Split', section: 'Money' },
  { id: 'suspense', label: 'Suspense', title: 'Suspense', section: 'Money' },
  { id: 'profit', label: 'Sales & Profit', title: 'Sales & Profit', section: 'Analysis' },
  { id: 'reports', label: 'Reports', title: 'Reports', section: 'Analysis' },
  { id: 'records', label: 'Records', title: 'Saved Reports', section: 'Analysis' },
  { id: 'settings', label: 'Settings', title: 'Settings', section: 'Setup' },
]

export const MOBILE_PRIMARY = ['dash', 'daybook', 'reports', 'records']
export const MOBILE_MORE = ['upload', 'purchases', 'expenses', 'deposits', 'profitsplit', 'suspense', 'profit', 'settings']
