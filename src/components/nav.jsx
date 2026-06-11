// Shared navigation config + inline SVG icons
const I = (path) => (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{path}</svg>
)

export const ICONS = {
  dash: I(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  upload: I(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>),
  purchases: I(<><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></>),
  expenses: I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  suspense: I(<><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.17a2 2 0 00-.59-1.42L12 12l-4.41 4.41A2 2 0 007 17.83V22" /><path d="M7 2v4.17a2 2 0 00.59 1.42L12 12l4.41-4.41A2 2 0 0017 6.17V2" /></>),
  records: I(<><path d="M4 4h16v4H4z" /><path d="M4 10h16v10H4z" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="17" x2="13" y2="17" /></>),
  settings: I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 01-4 0v-.09A1.65 1.65 0 007 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 14H4.5a2 2 0 010-4h.09A1.65 1.65 0 006 7a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 0010 4.6V4.5a2 2 0 014 0v.09a1.65 1.65 0 002.82 1.17 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 10v.09a1.65 1.65 0 001.17 2.82h.09a2 2 0 010 4h-.09a1.65 1.65 0 00-1.17.18z" /></>),
  more: I(<><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>),
}

export const PAGES = [
  { id: 'dash', label: 'Dashboard', title: 'Analytics Dashboard', section: 'Main' },
  { id: 'upload', label: 'Upload Report', title: 'Upload Daily Report', section: 'Main' },
  { id: 'purchases', label: 'Purchases', title: 'Purchases', section: 'Entries' },
  { id: 'expenses', label: 'Expenses', title: 'Expenses', section: 'Entries' },
  { id: 'suspense', label: 'Suspense', title: 'Suspense', section: 'Entries' },
  { id: 'records', label: 'Records', title: 'Saved Reports', section: 'Reports' },
  { id: 'settings', label: 'Settings', title: 'Settings', section: 'Reports' },
]

export const MOBILE_PRIMARY = ['dash', 'upload', 'purchases', 'records']
export const MOBILE_MORE = ['expenses', 'suspense', 'settings']
