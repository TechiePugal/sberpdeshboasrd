// Analytics over daily-report records (+ expenses, purchases, config).
// Pure functions, no I/O.
import { R, daysBetween, MODULES } from './helpers'

const sum = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0)

export function leaseDailyTotal(config) {
  if (!config?.lease_mode) return 0
  return MODULES.reduce((a, m) => a + (config.leased?.[m.id] ? Number(config.lease_amounts?.[m.id]) || 0 : 0), 0)
}
export function leasedModuleLabels(config) {
  if (!config?.lease_mode) return []
  return MODULES.filter((m) => config.leased?.[m.id]).map((m) => m.label)
}

// Aggregate reports + expenses + purchases over a filtered range.
export function aggregate(reports, expenses, purchases = [], config = {}, range = null, suspense = []) {
  const rs = [...reports].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const workingDays = rs.length // a "working day" = a day a report was uploaded
  const totSales = sum(rs, 'total_sales')
  const totCogs = sum(rs, 'cogs')
  const gross = totSales - totCogs
  const totExp = sum(expenses, 'amount')
  const totPurch = sum(purchases, 'amount')
  const totSuspense = sum(suspense, 'amount')
  const reduceSuspense = !!config.reduce_suspense

  // quantity tracking
  const qtyPurchased = sum(rs, 'purchase_qty')
  const qtySold = sum(rs, 'sold_qty') || sum(rs, 'total_qty_sold')
  const latest = rs[rs.length - 1] || null
  const qtyRemaining = latest?.closing_qty || 0

  // lease accrues per working (uploaded) day; recognised into profit at month end
  const leaseDay = leaseDailyTotal(config)
  const leaseIncome = leaseDay * workingDays

  const suspenseAdj = reduceSuspense ? totSuspense : 0
  const totIncome = totSales + leaseIncome
  const net = gross - totExp + leaseIncome - suspenseAdj
  const cashInHand = totSales - suspenseAdj - totExp
  const gpm = totSales > 0 ? +((gross / totSales) * 100).toFixed(1) : 0
  const npm = totSales > 0 ? +((net / totSales) * 100).toFixed(1) : 0
  const expRatio = totSales > 0 ? +((totExp / totSales) * 100).toFixed(1) : 0

  const trend = rs.map((r) => ({
    date: r.entry_date,
    sales: r.total_sales || 0,
    gross: (r.total_sales || 0) - (r.cogs || 0),
  }))

  return {
    days: rs.length, workingDays, totSales, totCogs, gross, totExp, totPurch, net, totSuspense, cashInHand,
    reduceSuspense, suspenseAdj, totIncome, qtyPurchased, qtySold, qtyRemaining,
    gpm, npm, expRatio, latest, trend, leaseIncome, leaseDay,
    leaseModules: leasedModuleLabels(config),
    closingStockValue: latest?.closing_stock_sale_value || 0,
    closingStockCost: latest?.closing_stock_cost || 0,
  }
}

// Day-end collections grouped by account, over a range.
export function paymentMix(reports) {
  const map = {}
  reports.forEach((r) => {
    const c = r.day_end?.collections || {}
    Object.entries(c).forEach(([acct, amt]) => { map[acct] = (map[acct] || 0) + (Number(amt) || 0) })
  })
  return Object.entries(map).map(([account, amount]) => ({ account, amount })).sort((a, b) => b.amount - a.amount)
}

// Running cash & bank balances. Balance is shown AS OF the end of the selected
// range (so it changes with the filter) while in/out reflect the period only.
// in  = day-end collections into the account
// out = purchases + expenses paid from the account (expenses default to Cash)
export function computeBalances(config, reports, purchases, expenses, range = null) {
  const accounts = config?.accounts?.length ? config.accounts : ['Cash']
  const to = range?.to || '9999-12-31'
  const from = range?.from || '0000-01-01'
  const inWin = (d) => d >= from && d <= to
  const upTo = (d) => d <= to

  return accounts.map((acct) => {
    const opening = Number(config?.openings?.[acct]) || 0
    let inToDate = 0, outToDate = 0, periodIn = 0, periodOut = 0
    reports.forEach((r) => {
      const amt = Number(r.day_end?.collections?.[acct]) || 0
      if (!amt) return
      if (upTo(r.entry_date)) inToDate += amt
      if (inWin(r.entry_date)) periodIn += amt
    })
    purchases.forEach((p) => {
      if ((p.paid_from || 'Cash') !== acct) return
      const amt = Number(p.amount) || 0
      if (upTo(p.purchase_date)) outToDate += amt
      if (inWin(p.purchase_date)) periodOut += amt
    })
    expenses.forEach((e) => {
      if ((e.paid_from || 'Cash') !== acct) return
      const amt = Number(e.amount) || 0
      if (upTo(e.expense_date)) outToDate += amt
      if (inWin(e.expense_date)) periodOut += amt
    })
    return { account: acct, opening, periodIn, periodOut, balance: opening + inToDate - outToDate }
  })
}

// Purchases grouped by category.
export function purchaseMix(purchases) {
  const map = {}
  purchases.forEach((p) => { const k = p.category || 'Other'; map[k] = (map[k] || 0) + (Number(p.amount) || 0) })
  return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
}

export function mergeItems(reports) {
  const map = {}
  reports.forEach((r) => (r.items || []).forEach((it) => {
    const key = it.name
    if (!map[key]) map[key] = { name: it.name, cat: it.cat, qty: 0, amount: 0, closing: 0, margin: it.margin, sRate: it.sRate, pRate: it.pRate, days: 0 }
    map[key].qty += it.qty || 0
    map[key].amount += it.amount || 0
    map[key].closing = it.closing || 0
    map[key].margin = it.margin
    if ((it.qty || 0) > 0) map[key].days += 1
  }))
  return Object.values(map)
}

export function categoryMix(reports) {
  const map = {}
  reports.forEach((r) => (r.items || []).forEach((it) => { map[it.cat] = (map[it.cat] || 0) + (it.amount || 0) }))
  return Object.entries(map).map(([cat, amount]) => ({ cat, amount })).sort((a, b) => b.amount - a.amount)
}

export function expenseMix(expenses) {
  const map = {}
  expenses.forEach((e) => { const k = e.category || e.reason || 'Other'; map[k] = (map[k] || 0) + (e.amount || 0) })
  return Object.entries(map).map(([reason, amount]) => ({ reason, amount })).sort((a, b) => b.amount - a.amount)
}

export function buildRecommendations(agg, items, expenses) {
  const recs = []
  const sellers = items.filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount)
  const push = (tone, icon, title, text) => recs.push({ tone, icon, title, text })

  if (agg.days === 0 && agg.leaseIncome === 0) {
    push('info', 'ℹ️', 'No data yet', 'Upload a daily stock + sales report to unlock insights.')
    return recs
  }
  if (sellers[0]) {
    const top = sellers[0]
    const share = agg.totSales > 0 ? ((top.amount / agg.totSales) * 100).toFixed(0) : 0
    push('good', '🏆', 'Top revenue driver', `${top.name} brought in ${R(top.amount)} — about ${share}% of all sales. Keep it well-stocked; running out costs you the most.`)
  }
  const byQty = [...sellers].sort((a, b) => b.qty - a.qty)
  if (byQty[0] && byQty[0].name !== sellers[0]?.name) {
    push('good', '🍺', 'Fastest mover (by units)', `${byQty[0].name} sold ${byQty[0].qty} units — your highest-volume line. Reorder this one first.`)
  }
  const marginPicks = sellers.filter((i) => i.margin >= 20 && i.amount > agg.totSales * 0.01).sort((a, b) => b.margin - a.margin)
  if (marginPicks[0]) {
    push('good', '💸', 'Push your high-margin winner', `${marginPicks[0].name} earns a ${marginPicks[0].margin}% margin and is already selling. Promoting it lifts profit faster than pushing low-margin stock.`)
  }
  const slow = items.filter((i) => i.closing > 15000 && i.qty <= 1).sort((a, b) => b.closing - a.closing)
  if (slow[0]) {
    const tied = slow.slice(0, 3).reduce((a, i) => a + i.closing, 0)
    push('warn', '🐌', 'Cash stuck in slow stock', `${slow[0].name}${slow[1] ? ' and others' : ''} are barely selling yet hold ${R(tied)} of closing stock. Consider a small offer to free up that cash.`)
  }
  if (agg.totSales > 0) {
    const tone = agg.gpm >= 18 ? 'good' : agg.gpm >= 12 ? 'warn' : 'bad'
    push(tone, '📊', 'Gross margin health', `Your gross margin is ${agg.gpm}% (${R(agg.gross)} on ${R(agg.totSales)} sales). For a TASMAC bar, 15–20% is healthy — ${agg.gpm >= 18 ? 'you are in good shape.' : agg.gpm >= 12 ? 'there is room to improve the mix.' : 'this is low — review pricing and shrinkage.'}`)
  }
  if (agg.leaseIncome > 0) {
    push('good', '🔑', 'Lease income', `Leased modules (${agg.leaseModules.join(', ')}) add ${R(agg.leaseIncome)} for this period at ${R(agg.leaseDay)}/day.`)
  }
  if (agg.totExp > 0) {
    const tone = agg.net >= 0 ? (agg.expRatio <= 10 ? 'good' : 'warn') : 'bad'
    push(tone, agg.net >= 0 ? '✅' : '🚨', agg.net >= 0 ? 'Profitable period' : 'Running at a loss', `Expenses are ${R(agg.totExp)} (${agg.expRatio}% of sales), leaving a net ${agg.net >= 0 ? 'profit' : 'loss'} of ${R(Math.abs(agg.net))}.`)
    const em = expenseMix(expenses)[0]
    if (em) push('info', '🧾', 'Biggest expense', `${em.reason} is your largest cost at ${R(em.amount)} (${((em.amount / agg.totExp) * 100).toFixed(0)}% of expenses).`)
  }
  if (agg.totSuspense > 0) {
    const share = agg.totSales > 0 ? ((agg.totSuspense / agg.totSales) * 100).toFixed(0) : 0
    push('warn', '⏳', 'Money not in hand (suspense)', `${R(agg.totSuspense)} (${share}% of sales) is booked but not in cash. Expected cash in hand is ${R(agg.cashInHand)}. Follow up so it doesn't turn into a loss.`)
  }
  if (agg.closingStockCost > 0) {
    push('info', '📦', 'Working capital in stock', `You are holding ${R(agg.closingStockCost)} of stock at cost. That is cash sitting on the shelf — keep slow lines lean.`)
  }
  return recs
}
