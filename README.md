# Siruvani Bar — Analytics & Reports

Upload-driven analytics for the daily TASMAC stock + sales reports. You upload
the two PDFs each day; the app reads the date and all figures automatically and
stores **only the extracted values** (the PDF file itself is not kept). On top
of that it tracks day-end cash/bank, purchases, expenses, suspense and lease
income — and turns everything into an analytics dashboard with recommendations.

## Pages
- **Dashboard** — sales, COGS, gross/net profit, expenses, purchases, suspense,
  expected cash-in-hand, lease income, live **Cash & Bank balances**, trend,
  top sellers, category mix, collection-by-mode, and a **💡 Recommendations**
  modal.
- **Upload Report** — attach the *Closing Stock* PDF (required) and *Sales*
  PDF (optional) → **Extract** reads the date + figures → review/fix the
  numbers, enter the **day-end Cash & Bank split**, add suspense → **Save**.
- **Purchases** — record TASMAC Bill, Cooldrinks, Cigarettes and Kitchen
  purchases, each *paid from* a chosen account (or Credit).
- **Expenses** — manual expenses with a reason.
- **Records** — every saved day, with full breakdown + day-end collection;
  edit suspense or delete.
- **Settings** — define your **payment accounts** (Cash, Paytm 1, Paytm 2…)
  with opening balances, and the **Lease Mode** toggle.

## Key ideas
- **Day-end Cash & Bank** — at save time you split the day's sales across your
  accounts (e.g. 3 L Cash + 1 L Paytm 1 + 0.5 L Paytm 2). Collections feed the
  running balances; purchases/expenses paid from an account reduce it.
  Balance = opening + collections − purchases − expenses.
- **Suspense** — money booked but not in hand (credit/transfer pending). It
  doesn't change profit, only lowers expected cash-in-hand.
- **Lease Mode** — turn on in Settings, tick the leased modules (Bar / Kitchen /
  Snacks) and set a daily lease amount each. That amount is booked as income
  (daily lease × days in the selected range) instead of tracking the module's
  own sales.
- **Where numbers come from** — headline figures (sales, COGS, stock,
  purchases-cost) are read from the stock report's exact summary block.
  Item-level analytics cover ~90% of sale lines; the top items are all caught.

## Setup
1. `npm install`
2. In the Firebase console, enable **Authentication → Email/Password** and
   **Firestore Database**. *(Storage is no longer used — no Blaze plan needed.)*
3. Paste `firestore.rules` into Firestore → Rules and Publish.
4. `npm run dev`, open the local URL, create an account, then set up your
   accounts in **Settings** and start uploading.

## Build
`npm run build` → static files in `dist/` (deploy to Firebase Hosting,
Netlify, Vercel, etc.).
