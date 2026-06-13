# Siruvani Bar — Financial Management

Upload the daily TASMAC reports; the app extracts the figures and turns them
into a full financial system: Purchases, Sales & Profit, Expenses, running
Cash & Bank balances, and printable reports — all driven by one saved date
filter.

## The global filter (set → Apply)
Every analysis page has a **Period** bar: pick Today / This week / This month /
Last month / custom dates, then press **Apply filter**. The choice is **saved**
and **reflects on every page** (Dashboard, Sales & Profit, Purchases, Expenses,
Suspense, Reports, Records). It does not update live — only on Apply.

## Modules
- **Dashboard** — headline **Total Income**, **Total Expense**, **Current
  Balance**, plus gross/net profit, lease, purchases, suspense, cash & bank
  balances, trend, top sellers, category split and a P&L. A **Report** button
  prints / saves it as PDF.
- **Upload Report** — attach the Closing Stock (and optional Sales) PDF →
  figures + quantities are read automatically → enter the day-end Cash/Bank
  split → Save. The PDF is not stored, only the values.
- **Purchases** — record purchases with **quantity, rate and value** (amount
  auto-calculates from qty × rate), category (TASMAC Bill / Cooldrinks /
  Cigarettes / Kitchen), paid-from account, notes, and full history.
- **Expenses** — add expenses manually with a reason/category and paid-from
  account; grouped history and by-reason chart.
- **Suspense** — separate ledger for money booked but not in hand.
- **Sales & Profit** — qty purchased, qty sold, remaining stock, revenue, COGS,
  gross profit, and a full product-level sales/profit breakdown.
- **Reports** — Monthly, Sales Breakdown, Purchases, Expenses, Profit & Loss,
  and Overall — each printable, all driven by the global filter.
- **Records** — saved daily reports; tap one to open its full report page with
  charts.
- **Settings** — payment accounts + opening balances, Lease Mode, and the
  Suspense toggle.

## Key logic
- **Lease** accrues at **daily amount × working days**, where a working day =
  a day you uploaded a report in the selected period. It is added to profit
  (recognised month-end).
- **Suspense toggle** (Settings, default **NO**): NO = suspense is shown but
  ignored in profit/cash. YES = suspense is **reduced at month-end** — deducted
  from net profit / cash-in-hand and listed in the monthly P&L.
- **Balances** = opening + collections − purchases − expenses (per account),
  shown as of the end of the selected period.
- Headline figures (sales, COGS, stock, quantities) come from the stock
  report's exact summary; item analytics cover ~90% of sale lines.

## Setup
1. `npm install`
2. Firebase console: enable **Authentication → Email/Password** and
   **Firestore Database**. (Storage is not used — no Blaze plan needed.)
3. Paste `firestore.rules` into Firestore → Rules and Publish.
4. `npm run dev` → create an account → set accounts in **Settings** → upload.

## Build
`npm run build` → static files in `dist/`.
