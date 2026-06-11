// Date range preset resolution
import { todayStr } from './helpers'

export const RP_PRESETS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['week', 'This week'],
  ['lweek', 'Last week'],
  ['month', 'This month'],
  ['lmonth', 'Last month'],
  ['all', 'All time'],
  ['custom', 'Custom'],
]

const fmt = (d) => d.toISOString().split('T')[0]

export function resolvePreset(val) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  let from = todayStr()
  let to = todayStr()

  if (val === 'today') { from = to = todayStr() }
  else if (val === 'yesterday') { const d = new Date(now); d.setDate(d.getDate() - 1); from = to = fmt(d) }
  else if (val === '7d') { const d = new Date(now); d.setDate(d.getDate() - 6); from = fmt(d) }
  else if (val === '30d') { const d = new Date(now); d.setDate(d.getDate() - 29); from = fmt(d) }
  else if (val === 'week') { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); from = fmt(d) }
  else if (val === 'lweek') {
    const e = new Date(now); e.setDate(e.getDate() - e.getDay() - 1)
    const s = new Date(e); s.setDate(s.getDate() - 6)
    from = fmt(s); to = fmt(e)
  }
  else if (val === 'month') { from = `${y}-${String(m + 1).padStart(2, '0')}-01` }
  else if (val === 'lmonth') {
    const lm = new Date(y, m, 0)
    from = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`
    to = fmt(lm)
  }
  else if (val === 'all') { from = '2020-01-01' }

  return { from, to }
}

export function financialYearRange() {
  const now = new Date()
  const m = now.getMonth()
  const y = now.getFullYear()
  const fyStart = m >= 3 ? y : y - 1 // Indian FY: Apr 1 – Mar 31
  return { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31`, label: `FY ${fyStart}-${fyStart + 1}` }
}

export const defaultRange = () => {
  const today = todayStr()
  const d = new Date(); d.setDate(d.getDate() - 29)
  return { from: fmt(d), to: today, label: 'Last 30 days' }
}
