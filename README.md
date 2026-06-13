# Siruvani Bar — Financial Management

Upload the daily TASMAC report → the app extracts the figures → it drives a full
cash/profit system: a Day Book, Purchases, Expenses, Bank Deposits, Profit
Splits, Sales & Profit and printable Reports — all under one saved date filter.

## Money model (how it all connects)
- **Cash** receives the day's **sales** (from the uploaded report).
- Cash goes **out** via: cash expenses, cash purchases, **bank deposits**, and
  **profit withdrawals** paid in cash.
- **Bank accounts** (GPay, Paytm, etc.) receive **deposits** (cash → bank) and
  pay out bank purchases/expenses/withdrawals.
- **Day Book** = the daily cash chain:
  `opening (yesterday's closing) + sales − (expenses + purchases + deposits + withdrawals paid in cash) = closing`.
  Closing carries forward as the next working day's opening. A working day = a
  day a report was uploaded.

## Pages
- **Dashboard** — Total Income · Total Expense · Current Balance, plus profit,
  balances, trend, top sellers and P&L. Print/Save-PDF.
- **Upload Report** — extract the day's figures + quantities and save (no PDF
  stored, no manual splitting; sales flow into the Day Book automatically).
- **Day Book** — daily cash flow: opening → sales → cash-out → closing, with a
  status per day. Pulls sales from the report.
- **Purchases** — qty, rate, value, category, paid-from account (Cash / a bank /
  Credit).
- **Expenses** — manual add with reason + paid-from account.
- **Bank Deposit** — move cash into a bank account; maintains bank balances.
- **Profit Split** — month-end withdrawals from a chosen account (reduces that
  balance; not counted as an expense).
- **Suspense** — money booked but not in hand (toggle in Settings controls
  whether it is reduced at month-end).
- **Sales & Profit** — qty purchased / sold / remaining, revenue, profit, and a
  product breakdown.
- **Reports** — Monthly, Sales Breakdown, Purchases, Expenses, P&L, Overall —
  all printable.
- **Records** — saved reports; open any day for a full report page (charts +
  its Day Book line).
- **Settings** — accounts + opening balances (the **first account = Cash** and
  its opening seeds the Day Book), Lease Mode, Suspense toggle.

## The filter (set → Apply → saved, everywhere)
Pick Today / This week / This month / custom on the **Period** bar and press
**Apply filter**. It saves and reflects on every page; it never updates live.

## Setup
1. `npm install`
2. Firebase: enable **Authentication → Email/Password** and **Firestore**.
   (Storage is not used.)
3. Publish `firestore.rules`.
4. `npm run dev` → create account → in **Settings** set Cash opening balance and
   add your bank accounts → upload a report.

## Build
`npm run build` → static files in `dist/`.
