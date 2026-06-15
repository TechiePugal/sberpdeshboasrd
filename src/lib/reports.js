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

  const openingStockCost = rs[0]?.opening_stock_cost || 0
  const closingStockCost = latest?.closing_stock_cost || 0
  const stockPurchaseCost = sum(rs, 'purchase_cost')
  const stockChange = closingStockCost - openingStockCost

  return {
    days: rs.length, workingDays, totSales, totCogs, gross, totExp, totPurch, net, totSuspense, cashInHand,
    reduceSuspense, suspenseAdj, totIncome, qtyPurchased, qtySold, qtyRemaining,
    gpm, npm, expRatio, latest, trend, leaseIncome, leaseDay,
    leaseModules: leasedModuleLabels(config),
    openingStockCost, stockPurchaseCost, stockChange,
    closingStockValue: latest?.closing_stock_sale_value || 0,
    closingStockCost,
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

// How a day's sales were received, per account. If a collection split was
// entered at upload, use it; otherwise treat the whole sale as cash.
export function salesByAccount(report, cashName) {
  const c = report?.day_end?.collections
  if (c && Object.values(c).some((v) => Number(v) > 0)) {
    const out = {}
    Object.entries(c).forEach(([k, v]) => { out[k] = Number(v) || 0 })
    return out
  }
  return { [cashName]: Number(report?.total_sales) || 0 }
}

// Cash & bank balances under the cash-book model:
//   sales land in the account they were received in (cash/UPI split)
//   Cash also pays out deposits (cash → bank)
//   each account pays out its purchases/expenses/withdrawals
export function computeBalances(config, data, range = null) {
  const { reports = [], purchases = [], expenses = [], deposits = [], withdrawals = [], additions = [], leasecollections = [] } = data
  const accounts = config?.accounts?.length ? config.accounts : ['Cash']
  const cashName = accounts[0]
  const to = range?.to || '9999-12-31'
  const from = range?.from || '0000-01-01'
  const inWin = (d) => d >= from && d <= to
  const upTo = (d) => d <= to

  return accounts.map((acct) => {
    const isCash = acct === cashName
    const opening = Number(config?.openings?.[acct]) || 0
    const openDate = config?.opening_dates?.[acct] || null
    let inToDate = 0, outToDate = 0, periodIn = 0, periodOut = 0
    const addIn = (d, amt) => { if (!amt) return; if (upTo(d)) inToDate += amt; if (inWin(d)) periodIn += amt }
    const addOut = (d, amt) => { if (!amt) return; if (upTo(d)) outToDate += amt; if (inWin(d)) periodOut += amt }

    if (openDate) addIn(openDate, opening) // opening effective from its date
    reports.forEach((r) => addIn(r.entry_date, salesByAccount(r, cashName)[acct] || 0))
    additions.forEach((x) => { if ((x.to_account || cashName) === acct) addIn(x.add_date, Number(x.amount) || 0) })
    leasecollections.forEach((x) => { if ((x.to_account || cashName) === acct) addIn(x.collect_date, Number(x.amount) || 0) })
    deposits.forEach((dp) => {
      const a = Number(dp.amount) || 0
      const from = dp.from_account || cashName // older records moved from cash
      if (dp.to_account === acct) addIn(dp.deposit_date, a)
      if (from === acct) addOut(dp.deposit_date, a)
    })
    purchases.forEach((p) => { if ((p.paid_from || cashName) === acct) addOut(p.purchase_date, Number(p.amount) || 0) })
    expenses.forEach((e) => { if ((e.paid_from || cashName) === acct) addOut(e.expense_date, Number(e.amount) || 0) })
    withdrawals.forEach((w) => { if ((w.from_account || cashName) === acct) addOut(w.withdraw_date, Number(w.amount) || 0) })

    const seed = openDate ? 0 : opening
    return { account: acct, isCash, opening, periodIn, periodOut, balance: seed + inToDate - outToDate }
  })
}

// Full day-by-day ledger across ALL accounts and ALL activity dates
// (reports, expenses, purchases, deposits, withdrawals). Each row carries the
// cash-flow breakdown plus every account's closing balance that day, so we can
// show bank availability alongside cash.
export function buildLedger(config, data) {
  const { reports = [], purchases = [], expenses = [], deposits = [], withdrawals = [], additions = [], leasecollections = [] } = data
  const accounts = config?.accounts?.length ? config.accounts : ['Cash']
  const cashName = accounts[0]
  const sumOn = (arr, dKey, d, aKey) => arr.filter((x) => x[dKey] === d && (x[aKey] || cashName) === cashName).reduce((a, x) => a + (Number(x.amount) || 0), 0)

  const dates = new Set()
  reports.forEach((r) => dates.add(r.entry_date))
  expenses.forEach((e) => dates.add(e.expense_date))
  purchases.forEach((p) => dates.add(p.purchase_date))
  deposits.forEach((dp) => dates.add(dp.deposit_date))
  withdrawals.forEach((w) => dates.add(w.withdraw_date))
  additions.forEach((x) => dates.add(x.add_date))
  leasecollections.forEach((x) => dates.add(x.collect_date))
  accounts.forEach((a) => { if (config?.opening_dates?.[a] && (Number(config?.openings?.[a]) || 0)) dates.add(config.opening_dates[a]) })
  const sorted = [...dates].filter(Boolean).sort()

  const bal = {}
  accounts.forEach((a) => { bal[a] = config?.opening_dates?.[a] ? 0 : (Number(config?.openings?.[a]) || 0) })
  const reportByDate = {}
  reports.forEach((r) => { reportByDate[r.entry_date] = r })

  const openingOn = (a, d) => (config?.opening_dates?.[a] === d ? (Number(config?.openings?.[a]) || 0) : 0)

  const rows = sorted.map((d) => {
    const r = reportByDate[d]
    const sba = r ? salesByAccount(r, cashName) : {}
    const opening = bal[cashName]
    const sales = sba[cashName] || 0
    const exp = sumOn(expenses, 'expense_date', d, 'paid_from')
    const pur = sumOn(purchases, 'purchase_date', d, 'paid_from')
    const dep = deposits.filter((x) => x.deposit_date === d && (x.from_account || cashName) === cashName).reduce((a, x) => a + (Number(x.amount) || 0), 0)
    const wd = sumOn(withdrawals, 'withdraw_date', d, 'from_account')
    const addedCash = openingOn(cashName, d)
      + additions.filter((x) => x.add_date === d && (x.to_account || cashName) === cashName).reduce((a, x) => a + (Number(x.amount) || 0), 0)
      + leasecollections.filter((x) => x.collect_date === d && (x.to_account || cashName) === cashName).reduce((a, x) => a + (Number(x.amount) || 0), 0)
      + deposits.filter((x) => x.deposit_date === d && x.to_account === cashName).reduce((a, x) => a + (Number(x.amount) || 0), 0)

    accounts.forEach((a) => {
      let delta = (sba[a] || 0) + openingOn(a, d)
      additions.filter((x) => x.add_date === d && (x.to_account || cashName) === a).forEach((x) => { delta += Number(x.amount) || 0 })
      leasecollections.filter((x) => x.collect_date === d && (x.to_account || cashName) === a).forEach((x) => { delta += Number(x.amount) || 0 })
      deposits.filter((x) => x.deposit_date === d).forEach((x) => { const amt = Number(x.amount) || 0; const from = x.from_account || cashName; if (x.to_account === a) delta += amt; if (from === a) delta -= amt })
      purchases.filter((x) => x.purchase_date === d && (x.paid_from || cashName) === a).forEach((x) => { delta -= Number(x.amount) || 0 })
      expenses.filter((x) => x.expense_date === d && (x.paid_from || cashName) === a).forEach((x) => { delta -= Number(x.amount) || 0 })
      withdrawals.filter((x) => x.withdraw_date === d && (x.from_account || cashName) === a).forEach((x) => { delta -= Number(x.amount) || 0 })
      bal[a] += delta
    })

    return { date: d, hasReport: !!r, opening, sales, added: addedCash, exp, pur, dep, wd, out: exp + pur + dep + wd, closing: bal[cashName], balances: { ...bal } }
  })

  return { accounts, cashName, rows, balances: { ...bal } }
}

// Backwards-compatible cash chain (report days only) used by the report detail.
export function buildDayBook(config, data) {
  return buildLedger(config, data).rows.filter((r) => r.hasReport)
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
