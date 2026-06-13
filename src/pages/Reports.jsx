import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { filterRange, R } from '../lib/helpers'
import {
  aggregate, mergeItems, categoryMix, expenseMix, purchaseMix, computeBalances, paymentMix,
} from '../lib/reports'
import FilterBar from '../components/FilterBar'

const TYPES = [
  ['monthly', 'Monthly'], ['sales', 'Sales Breakdown'], ['purchase', 'Purchases'],
  ['expense', 'Expenses'], ['pnl', 'Profit & Loss'], ['overall', 'Overall'],
]

export default function Reports() {
  const { reports, expenses, purchases, suspense, deposits, withdrawals, config, filter } = useData()
  const [type, setType] = useState('monthly')

  const fr = filterRange(reports, 'entry_date', filter)
  const fe = filterRange(expenses, 'expense_date', filter)
  const fp = filterRange(purchases, 'purchase_date', filter)
  const fsus = filterRange(suspense, 'suspense_date', filter)
  const fd = filterRange(deposits, 'deposit_date', filter)
  const fw = filterRange(withdrawals, 'withdraw_date', filter)
  const agg = useMemo(() => aggregate(fr, fe, fp, config, filter, fsus), [fr, fe, fp, config, filter, fsus])
  const items = useMemo(() => mergeItems(fr).map((i) => ({ ...i, profit: Math.round((i.sRate - i.pRate) * i.qty) })), [fr])
  const balances = useMemo(() => computeBalances(config, { reports, purchases, expenses, deposits, withdrawals }, filter), [config, reports, purchases, expenses, deposits, withdrawals, filter])
  const currentBalance = balances.reduce((a, b) => a + b.balance, 0)
  const typeLabel = TYPES.find((t) => t[0] === type)[1]

  const data = { agg, items, balances, currentBalance, fr, fe, fp, fd, fw, filter,
    catMix: categoryMix(fr), expMix: expenseMix(fe), purMix: purchaseMix(fp), payMix: paymentMix(fr) }

  return (
    <>
      <div className="card no-print">
        <div className="ch"><h3>Reports</h3><button className="btn bf btn-sm" onClick={() => window.print()}>📄 Print full report (PDF)</button></div>
        <FilterBar />
        <div className="fb-presets" style={{ marginTop: 12 }}>
          {TYPES.map(([v, l]) => <button key={v} className={'fb-chip' + (type === v ? ' on' : '')} onClick={() => setType(v)}>{l}</button>)}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t2)' }}>On screen: <strong>{typeLabel}</strong>. Print outputs the <strong>complete</strong> summary (all sections).</div>
      </div>

      {/* On-screen: selected section only */}
      <div className="screen-report">
        {type === 'monthly' && <Monthly d={data} />}
        {type === 'sales' && <SalesBreak d={data} />}
        {type === 'purchase' && <PurchaseRep d={data} />}
        {type === 'expense' && <ExpenseRep d={data} />}
        {type === 'pnl' && <section className="card"><div className="ch"><h3>Profit &amp; Loss statement</h3></div><PnLRows agg={agg} /></section>}
        {type === 'overall' && <Overall d={data} />}
      </div>

      {/* Print: full detailed report */}
      <div className="print-only"><FullReport d={data} /></div>
    </>
  )
}

const Stat = ({ c, l, v, s }) => <div className={'kc ' + c}><div className="kl">{l}</div><div className="kv">{v}</div>{s && <div className="ks">{s}</div>}</div>

function PnLRows({ agg }) {
  return (
    <>
      <div className="dr"><span className="dl">Total Sales</span><span className="dv g">{R(agg.totSales)}</span></div>
      <div className="dr"><span className="dl">Less: COGS</span><span className="dv a">{R(agg.totCogs)}</span></div>
      <div className="dr tot"><span className="dl">Gross Profit</span><span className="dv b">{R(agg.gross)}</span></div>
      {agg.leaseIncome > 0 && <div className="dr"><span className="dl">Add: Lease income ({agg.workingDays} days)</span><span className="dv g">{R(agg.leaseIncome)}</span></div>}
      <div className="dr"><span className="dl">Less: Expenses</span><span className="dv r">{R(agg.totExp)}</span></div>
      {agg.reduceSuspense && <div className="dr"><span className="dl">Less: Suspense (month-end)</span><span className="dv r">{R(agg.totSuspense)}</span></div>}
      <div className="dr tot"><span className="dl">Net Profit</span><span className={'dv ' + (agg.net >= 0 ? 'g' : 'r')}>{R(agg.net)}</span></div>
    </>
  )
}

const Headline = ({ agg, currentBalance }) => (
  <div className="krow">
    <Stat c="g" l="Total Income" v={R(agg.totIncome)} />
    <Stat c="r" l="Total Expense" v={R(agg.totExp)} />
    <Stat c={agg.net >= 0 ? 'b' : 'r'} l="Net Profit" v={R(agg.net)} s={`${agg.npm}% margin`} />
    <Stat c="b" l="Current Balance" v={R(currentBalance)} />
  </div>
)

const DailyTable = ({ fr }) => (
  <section className="card"><div className="ch"><h3>Daily summary</h3><small style={{ color: 'var(--t2)' }}>{fr.length} working day(s)</small></div>
    <div className="tw"><table className="tbl">
      <thead><tr><th>Date</th><th className="n">Sales</th><th className="n">COGS</th><th className="n">Gross</th></tr></thead>
      <tbody>{[...fr].reverse().map((r) => <tr key={r.id}><td>{r.entry_date}</td><td className="n" style={{ color: 'var(--grn)' }}>{R(r.total_sales || 0)}</td><td className="n">{R(r.cogs || 0)}</td><td className="n" style={{ color: 'var(--blu)' }}>{R(r.gross_profit || 0)}</td></tr>)}</tbody>
    </table></div>
  </section>
)

const ProductTable = ({ items }) => {
  const sorted = [...items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount)
  return (
    <section className="card"><div className="ch"><h3>Product sales breakdown</h3></div>
      <div className="tw"><table className="tbl">
        <thead><tr><th>Product</th><th>Category</th><th className="n">Units</th><th className="n">Revenue</th><th className="n">Margin</th><th className="n">Profit</th></tr></thead>
        <tbody>{sorted.map((i) => <tr key={i.name}><td>{i.name}</td><td style={{ color: 'var(--t2)' }}>{i.cat}</td><td className="n">{i.qty}</td><td className="n" style={{ color: 'var(--grn)' }}>{R(i.amount)}</td><td className="n">{i.margin}%</td><td className="n" style={{ color: 'var(--blu)' }}>{R(i.profit || 0)}</td></tr>)}</tbody>
      </table></div>
    </section>
  )
}

const Monthly = ({ d }) => <><Headline agg={d.agg} currentBalance={d.currentBalance} /><section className="card"><div className="ch"><h3>Profit &amp; loss</h3></div><PnLRows agg={d.agg} /></section><DailyTable fr={d.fr} /></>

const SalesBreak = ({ d }) => (
  <>
    <div className="krow">
      <Stat c="a" l="Qty Purchased" v={d.agg.qtyPurchased.toLocaleString('en-IN')} />
      <Stat c="g" l="Qty Sold" v={d.agg.qtySold.toLocaleString('en-IN')} />
      <Stat c="b" l="Remaining Stock" v={d.agg.qtyRemaining.toLocaleString('en-IN')} />
      <Stat c="g" l="Revenue" v={R(d.agg.totSales)} />
    </div>
    <section className="card"><div className="ch"><h3>By category</h3></div>{d.catMix.map((c) => <div className="dr" key={c.cat}><span className="dl">{c.cat}</span><span className="dv g">{R(c.amount)}</span></div>)}</section>
    <ProductTable items={d.items} />
  </>
)

const PurchaseRep = ({ d }) => (
  <>
    <div className="krow"><Stat c="a" l="Total Purchases" v={R(d.agg.totPurch)} s={`${d.fp.length} entries`} /></div>
    <section className="card"><div className="ch"><h3>By category</h3></div>{d.purMix.length ? d.purMix.map((m) => <div className="dr" key={m.category}><span className="dl">{m.category}</span><span className="dv a">{R(m.amount)}</span></div>) : <div className="notice">No purchases.</div>}</section>
    <section className="card"><div className="ch"><h3>Purchase history</h3></div>
      <div className="tw"><table className="tbl"><thead><tr><th>Date</th><th>Category</th><th className="n">Qty</th><th className="n">Amount</th><th>Paid from</th></tr></thead>
        <tbody>{[...d.fp].reverse().map((p) => <tr key={p.id}><td>{p.purchase_date}</td><td>{p.category}</td><td className="n">{p.quantity || '—'}</td><td className="n" style={{ fontWeight: 700 }}>{R(p.amount)}</td><td>{p.paid_from || 'Cash'}</td></tr>)}</tbody>
      </table></div></section>
  </>
)

const ExpenseRep = ({ d }) => (
  <>
    <div className="krow"><Stat c="r" l="Total Expenses" v={R(d.agg.totExp)} s={`${d.fe.length} entries · ${d.agg.expRatio}% of sales`} /></div>
    <section className="card"><div className="ch"><h3>By reason</h3></div>{d.expMix.length ? d.expMix.map((m) => <div className="dr" key={m.reason}><span className="dl">{m.reason}</span><span className="dv r">{R(m.amount)}</span></div>) : <div className="notice">No expenses.</div>}</section>
    <section className="card"><div className="ch"><h3>Expense history</h3></div>
      <div className="tw"><table className="tbl"><thead><tr><th>Date</th><th>Reason</th><th className="n">Amount</th><th>Paid from</th></tr></thead>
        <tbody>{[...d.fe].reverse().map((e) => <tr key={e.id}><td>{e.expense_date}</td><td>{e.category}</td><td className="n" style={{ color: 'var(--red)', fontWeight: 700 }}>{R(e.amount)}</td><td>{e.paid_from || 'Cash'}</td></tr>)}</tbody>
      </table></div></section>
  </>
)

const BalancesCard = ({ balances, currentBalance, payMix }) => (
  <section className="card"><div className="ch"><h3>Balances &amp; collection</h3></div>
    {balances.map((b) => <div className="dr" key={b.account}><span className="dl">{b.account}</span><span className="dv b">{R(b.balance)}</span></div>)}
    <div className="dr tot"><span className="dl">Total on hand</span><span className="dv b">{R(currentBalance)}</span></div>
    {payMix.map((p) => <div className="dr" key={p.account}><span className="dl" style={{ color: 'var(--t2)' }}>Collected · {p.account}</span><span className="dv">{R(p.amount)}</span></div>)}
  </section>
)

const Overall = ({ d }) => (
  <>
    <Headline agg={d.agg} currentBalance={d.currentBalance} />
    <div className="g2">
      <section className="card"><div className="ch"><h3>Profit &amp; loss</h3></div><PnLRows agg={d.agg} /></section>
      <BalancesCard balances={d.balances} currentBalance={d.currentBalance} payMix={d.payMix} />
    </div>
    <ProductTable items={d.items} />
  </>
)

// Full detailed report for printing — every section, flows across pages.
function FullReport({ d }) {
  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — Complete Business Report</h2><div>{d.filter.label} · {d.filter.from} to {d.filter.to}</div></div>
      <h3 style={{ margin: '6px 0' }}>1. Summary</h3>
      <Headline agg={d.agg} currentBalance={d.currentBalance} />
      <div className="krow">
        <Stat c="a" l="Purchases" v={R(d.agg.totPurch)} />
        <Stat c="g" l="Gross Profit" v={R(d.agg.gross)} s={`${d.agg.gpm}%`} />
        {d.agg.leaseIncome > 0 && <Stat c="p" l="Lease Income" v={R(d.agg.leaseIncome)} />}
        <Stat c="p" l="Suspense" v={R(d.agg.totSuspense)} s={d.agg.reduceSuspense ? 'reduced' : 'ignored'} />
        <Stat c="a" l="Stock at cost" v={R(d.agg.closingStockCost)} />
      </div>
      <h3 style={{ margin: '6px 0' }}>2. Profit &amp; Loss</h3>
      <section className="card"><PnLRows agg={d.agg} /></section>
      <h3 style={{ margin: '6px 0' }}>3. Sales &amp; Quantities</h3>
      <div className="krow">
        <Stat c="a" l="Qty Purchased" v={d.agg.qtyPurchased.toLocaleString('en-IN')} />
        <Stat c="g" l="Qty Sold" v={d.agg.qtySold.toLocaleString('en-IN')} />
        <Stat c="b" l="Remaining Stock" v={d.agg.qtyRemaining.toLocaleString('en-IN')} />
        <Stat c="g" l="Revenue" v={R(d.agg.totSales)} />
      </div>
      <section className="card"><div className="ch"><h3>Sales by category</h3></div>{d.catMix.map((c) => <div className="dr" key={c.cat}><span className="dl">{c.cat}</span><span className="dv g">{R(c.amount)}</span></div>)}</section>
      <ProductTable items={d.items} />
      <h3 style={{ margin: '6px 0' }}>4. Daily Summary</h3>
      <DailyTable fr={d.fr} />
      <h3 style={{ margin: '6px 0' }}>5. Purchases</h3>
      <PurchaseRep d={d} />
      <h3 style={{ margin: '6px 0' }}>6. Expenses</h3>
      <ExpenseRep d={d} />
      <h3 style={{ margin: '6px 0' }}>7. Balances, Deposits &amp; Withdrawals</h3>
      <BalancesCard balances={d.balances} currentBalance={d.currentBalance} payMix={d.payMix} />
      {d.fd.length > 0 && (
        <section className="card"><div className="ch"><h3>Bank deposits</h3></div>
          {[...d.fd].reverse().map((x) => <div className="dr" key={x.id}><span className="dl">{x.deposit_date} → {x.to_account}</span><span className="dv a">{R(x.amount)}</span></div>)}
        </section>
      )}
      {d.fw.length > 0 && (
        <section className="card"><div className="ch"><h3>Profit withdrawals</h3></div>
          {[...d.fw].reverse().map((x) => <div className="dr" key={x.id}><span className="dl">{x.withdraw_date} · {x.from_account}{x.note ? ` · ${x.note}` : ''}</span><span className="dv p">{R(x.amount)}</span></div>)}
        </section>
      )}
    </>
  )
}
