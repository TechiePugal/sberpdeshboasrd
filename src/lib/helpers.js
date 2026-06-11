// Formatting + business-logic helpers

export const R = (n) => '₹' + (Math.round(n) || 0).toLocaleString('en-IN')

export const todayStr = () => new Date().toISOString().split('T')[0]

export const ML = (m) =>
  ({ cash: 'Cash', bank1: 'Hotel Siruvani', bank2: 'SW Club', upi: 'UPI', dd: 'DD/Cheque', rtgs: 'RTGS', credit: 'Credit' }[m] || m)

// True sales = sum of all individual fields (stored gross_sales may be stale)
export const calcTrueSales = (s) =>
  (s.liquor_sales || 0) +
  (s.express_sales || 0) +
  (s.token_sales || 0) +
  (s.food_sales || 0) +
  (s.ac_charges || 0) +
  (s.other_sales || 0) +
  (s.cooldrink_sales || 0) +
  (s.cigarette_sales || 0)

export const calcTrueSalesArr = (arr) => arr.reduce((a, s) => a + calcTrueSales(s), 0)

export const num = (v) => parseFloat(v) || 0

// Filter an array of records whose `key` date falls within [from, to]
export const filterRange = (arr, key, range) =>
  arr.filter((r) => r[key] >= range.from && r[key] <= range.to)

export const purType = (p) => p.purchase_type || p.type

export const PURCHASE_LABELS = { liquor: 'TASMAC Liquor', cooldrink: 'Cooldrink', cigarette: 'Cigarette' }

// Purchase categories for the new purchases flow
export const PURCHASE_CATEGORIES = ['TASMAC Bill', 'Cooldrinks', 'Cigarettes', 'Kitchen']

// Business modules (for Lease Mode)
export const MODULES = [
  { id: 'bar', label: 'Bar (TASMAC liquor)' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'snacks', label: 'Snacks (Cooldrinks & Cigarettes)' },
]

// Default day-end payment accounts (cash + UPI/bank); user-editable in Settings
export const DEFAULT_ACCOUNTS = ['Cash', 'Paytm 1', 'Paytm 2']

// Inclusive day count between two YYYY-MM-DD dates
export const daysBetween = (from, to) => {
  const a = new Date(from), b = new Date(to)
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

export const DEFAULT_CATEGORIES = {
  Kitchen: ['Gas', 'Chef Salary', 'Market Purchase', 'Token Purchase', 'Groceries', 'Fruits', 'Provisions', 'Spices'],
  Rent: [],
  Electricity: [],
  Salary: [],
  'Tasmac Auto & Bill': [],
  'Admin & Govt Commission': [],
  'General Expenses': [],
  'Repairs & Maintenance': [],
  'GST & Bank Charges': [],
  'Other Expenses': [],
}
