// Browser-side PDF extraction + parsing for the TASMAC daily reports.
// We reconstruct table rows from pdf.js text items (group by Y, order by X),
// then parse two report types:
//   • Closing Stock report  → authoritative summary block + per-item analytics
//   • Sales (billing) report → day total + per-item billing
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// ── Row reconstruction ─────────────────────────────────────────
export async function extractRows(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
  const rows = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines = {}
    for (const it of content.items) {
      if (!it.str || !it.str.trim()) continue
      const y = Math.round(it.transform[5])
      const x = it.transform[4]
      ;(lines[y] = lines[y] || []).push({ x, s: it.str })
    }
    Object.keys(lines).map(Number).sort((a, b) => b - a).forEach((y) => {
      const line = lines[y].sort((a, b) => a.x - b.x).map((o) => o.s).join(' ').replace(/\s+/g, ' ').trim()
      if (line) rows.push(line)
    })
  }
  return rows
}

const RATE = /^\d+\.\d{3}$/   // P.Rate / S.Rate  (3 decimals)
const MONEY = /^\d+\.\d{2}$/  // value columns    (2 decimals)

const CATEGORY_HEADERS = ['BEER TIN', 'BEER', 'FULL', 'GENERAL', 'HALF', 'QUATER', 'QUARTER', 'WHISKY', 'WINE']

export function parseReportDate(rows) {
  for (const r of rows) {
    const m = r.match(/FROM\s+(\d{2})-(\d{2})-(\d{4})/i) || r.match(/Billing From\s*:?\s*(\d{2})-(\d{2})-(\d{4})/i)
    if (m) return `${m[3]}-${m[2]}-${m[1]}` // DD-MM-YYYY → YYYY-MM-DD
  }
  return null
}

// ── Closing Stock report ───────────────────────────────────────
export function parseStockReport(rows) {
  const out = { date: parseReportDate(rows), items: [], summary: {} }
  let cat = 'OTHER'
  let nameBuf = ''
  for (const r of rows) {
    if (/SIRUVANI BAR|TIRUPUR|STOCK REPORT|ITEMNAME|OP\.STK|ML \/ UNIT|PARTICULAR|^LIQUOR|^BEER :|^TIN BEER|^WINE :|PROFIT/i.test(r)) {
      const gt = r.match(/GRAND TOTAL\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i)
      if (gt) { out.summary.openQty = +gt[1]; out.summary.purchQty = +gt[2]; out.summary.saleQty = +gt[4]; out.summary.closeQty = +gt[5] }
      nameBuf = ''; continue
    }
    const gt = r.match(/GRAND TOTAL\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i)
    if (gt) { out.summary.openQty = +gt[1]; out.summary.purchQty = +gt[2]; out.summary.saleQty = +gt[4]; out.summary.closeQty = +gt[5]; nameBuf = ''; continue }

    const upper = r.toUpperCase().trim()
    const hdr = CATEGORY_HEADERS.find((h) => upper === h)
    if (hdr) { cat = hdr === 'QUARTER' ? 'QUATER' : hdr; nameBuf = ''; continue }

    let m
    if ((m = r.match(/OB Stock Purch\s*:\s*([\d.]+)/i))) { out.summary.openingPurch = +m[1]; nameBuf = '' }
    if ((m = r.match(/OP Stock Sales\s*:\s*([\d.]+)/i))) out.summary.openingSales = +m[1]
    if ((m = r.match(/Sales P\.Rate\s*:\s*([\d.]+)/i))) out.summary.cogs = +m[1]
    if ((m = r.match(/Sales S\.Rate\s*:\s*([\d.]+)/i))) out.summary.sales = +m[1]
    if ((m = r.match(/Purchase P\.Rate\s*:\s*([\d.]+)/i))) out.summary.purchaseCost = +m[1]
    if ((m = r.match(/Closing P\.Rate\s*:\s*([\d.]+)/i))) out.summary.closingPurch = +m[1]
    if ((m = r.match(/Closing S\.Rate\s*:\s*([\d.]+)/i))) out.summary.closingSales = +m[1]

    const toks = r.split(' ')
    const rateIdx = toks.findIndex((t) => RATE.test(t))
    const isData = rateIdx > 0 && RATE.test(toks[rateIdx + 1] || '')

    if (isData) {
      const leadName = toks.slice(0, rateIdx).filter((t) => !/^\d+$/.test(t)).join(' ').trim()
      const name = leadName || nameBuf
      nameBuf = ''
      const pRate = +toks[rateIdx]
      const sRate = +toks[rateIdx + 1]
      const vals = toks.slice(rateIdx + 2).filter((t) => MONEY.test(t)).map(Number)
      const closingValue = vals[1] || 0           // closing stock at sale rate
      const closingCost = vals[0] || 0            // closing stock at purchase rate
      const saleAmount = vals.length >= 3 ? vals[vals.length - 1] : 0
      const saleQty = sRate ? Math.round(saleAmount / sRate) : 0
      const marginPct = sRate ? +(((sRate - pRate) / sRate) * 100).toFixed(1) : 0
      if (name) out.items.push({ name, cat, pRate, sRate, saleAmount, saleQty, closingValue, closingCost, marginPct })
    } else if (rateIdx === -1 && /[A-Za-z]/.test(r) && !/^\s*\d/.test(r)) {
      nameBuf = r.trim()
    } else {
      nameBuf = ''
    }
  }
  return out
}

// ── Sales (billing) report ─────────────────────────────────────
export function parseSalesReport(rows) {
  const out = { date: parseReportDate(rows), items: [], total: 0, qty: 0 }
  let nameBuf = ''
  for (const r of rows) {
    const tm = r.match(/Total Amount\s+([\d.]+)\s+([\d.]+)/i)
    if (tm) { out.qty = +tm[1]; out.total = +tm[2]; nameBuf = ''; continue }
    if (/SIRUVANI BAR|TIRUPUR|Billing From|BILL No|Liqued Item|^=+$/i.test(r)) { nameBuf = ''; continue }

    // item line: NAME QTY.00 RATE.00 AMOUNT.00  (qty/rate/amount are 2-dec)
    const toks = r.split(' ')
    const nums = []
    let nameEnd = toks.length
    for (let i = toks.length - 1; i >= 0; i--) {
      if (MONEY.test(toks[i])) { nums.unshift(+toks[i]); nameEnd = i } else break
    }
    const lead = toks.slice(0, nameEnd).join(' ').trim()
    if (nums.length >= 3) {
      const [qty, rate, amount] = nums.slice(-3)
      const name = (lead || nameBuf).trim()
      nameBuf = ''
      if (name) out.items.push({ name, qty, rate, amount })
    } else if (nums.length === 0 && /[A-Za-z]/.test(r)) {
      nameBuf = r.trim()
    } else {
      nameBuf = ''
    }
  }
  return out
}

// ── Combine into a single daily-report record ──────────────────
// stockFile is primary (authoritative summary + margins); salesFile optional.
export async function parseDailyUpload(stockFile, salesFile) {
  const result = { ok: false, warnings: [] }

  let stock = null
  if (stockFile) {
    const rows = await extractRows(stockFile)
    stock = parseStockReport(rows)
  }
  let sales = null
  if (salesFile) {
    const rows = await extractRows(salesFile)
    sales = parseSalesReport(rows)
  }

  const date = stock?.date || sales?.date
  if (!date) { result.error = 'Could not read the report date from either PDF.'; return result }
  if (stock && sales && stock.date && sales.date && stock.date !== sales.date) {
    result.warnings.push(`Date mismatch: stock report is ${stock.date}, sales report is ${sales.date}. Using ${date}.`)
  }

  const s = stock?.summary || {}
  // Authoritative figures from the stock summary block; fall back to sales report total.
  const totalSales = s.sales ?? sales?.total ?? 0
  const cogs = s.cogs ?? 0
  const grossProfit = totalSales - cogs

  if (!totalSales) result.warnings.push('Total sales came through as 0 — please check the values below.')
  if (stock && !s.cogs) result.warnings.push('Could not read COGS (Sales P.Rate) from the stock report.')

  result.ok = true
  result.record = {
    entry_date: date,
    total_sales: totalSales,
    cogs,
    gross_profit: grossProfit,
    total_qty_sold: s.saleQty ?? sales?.qty ?? 0,
    sold_qty: s.saleQty ?? sales?.qty ?? 0,
    opening_qty: s.openQty ?? 0,
    purchase_qty: s.purchQty ?? 0,
    closing_qty: s.closeQty ?? 0,
    opening_stock_cost: s.openingPurch ?? 0,
    closing_stock_cost: s.closingPurch ?? 0,
    closing_stock_sale_value: s.closingSales ?? 0,
    purchase_cost: s.purchaseCost ?? 0,
    items: (stock?.items || []).map((i) => ({
      name: i.name, cat: i.cat, qty: i.saleQty, amount: i.saleAmount,
      closing: i.closingValue, margin: i.marginPct, sRate: i.sRate, pRate: i.pRate,
    })),
    sales_items: sales?.items || [],
    item_coverage: totalSales ? Math.round(((stock?.items || []).reduce((a, i) => a + i.saleAmount, 0) / totalSales) * 100) : 0,
  }
  return result
}
