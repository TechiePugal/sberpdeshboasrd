import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { filterRange, R } from '../lib/helpers'
import {
  aggregate, mergeItems, categoryMix, expenseMix, purchaseMix, computeBalances, paymentMix,
} from '../lib/reports'
import FilterBar from '../components/FilterBar'

const TYPES = [
  ['monthly', 'Monthly'],
  ['sales', 'Sales Breakdown'],
  ['purchase', 'Purchases'],
  ['expense', 'Expenses'],
  ['pnl', 'Profit & Loss'],
  ['overall', 'Overall'],
]

export default function Reports() {
  const { reports, expenses, purchases, suspense, config, filter } = useData()
  const [type, setType] = useState('monthly')

  const fr = filterRange(reports, 'entry_date', filter)
  const fe = filterRange(expenses, 'expense_date', filter)
  const fp = filterRange(purchases, 'purchase_date', filter)
  const fsus = filterRange(suspense, 'suspense_date', filter)
  const agg = useMemo(() => aggregate(fr, fe, fp, config, filter, fsus), [fr, fe, fp, config, filter, fsus])
  const items = useMemo(() => mergeItems(fr), [fr])
  const balances = useMemo(() => computeBalances(config, reports, purchases, expenses, filter), [config, reports, purchases, expenses, filter])
  const currentBalance = balances.reduce((a, b) => a + b.balance, 0)
  const typeLabel = TYPES.find((t) => t[0] === type)[1]

  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — {typeLabel} Report</h2><div>{filter.label} · {filter.from} to {filter.to}</div></div>

      <div className="card no-print">
        <div className="ch"><h3>Reports</h3><button className="btn bo btn-sm" onClick={() => window.print()}>📄 Print / Save PDF</button></div>
        <FilterBar />
        <div className="fb-presets" style={{ marginTop: 12 }}>
          {TYPES.map(([v, l]) => <button key={v} className={'fb-chip' + (type === v ? ' on' : '')} onClick={() => setType(v)}>{l}</button>)}
        </div>
      </div>

      {type === 'monthly' && <Monthly agg={agg} currentBalance={currentBalance} fr={fr} />}
      {type === 'sales' && <SalesBreak agg={agg} items={items} catMix={categoryMix(fr)} />}
      {type === 'purchase' && <PurchaseRep mix={purchaseMix(fp)} list={fp} agg={agg} />}
      {type === 'expense' && <ExpenseRep mix={expenseMix(fe)} list={fe} agg={agg} />}
      {type === 'pnl' && <PnL agg={agg} />}
      {type === 'overall' && <Overall agg={agg} balances={balances} currentBalance={currentBalance} payMix={paymentMix(fr)} items={items} />}
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

function Monthly({ agg, currentBalance, fr }) {
  return (
    <>
      <div className="krow">
        <Stat c="g" l="Total Income" v={R(agg.totIncome)} />
        <Stat c="r" l="Total Expense" v={R(agg.totExp)} />
        <Stat c={agg.net >= 0 ? 'b' : 'r'} l="Net Profit" v={R(agg.net)} s={`${agg.npm}% margin`} />
        <Stat c="b" l="Current Balance" v={R(currentBalance)} />
      </div>
      <div className="card"><div className="ch"><h3>Profit & loss</h3></div><PnLRows agg={agg} /></div>
      <div className="card">
        <div className="ch"><h3>Daily summary</h3><small style={{ color: 'var(--t2)' }}>{fr.length} working day(s)</small></div>
        <div className="tw"><table className="tbl">
          <thead><tr><th>Date</th><th className="n">Sales</th><th className="n">COGS</th><th className="n">Gross</th></tr></thead>
          <tbody>{[...fr].reverse().map((r) => (
            <tr key={r.id}><td>{r.entry_date}</td><td className="n" style={{ color: 'var(--grn)' }}>{R(r.total_sales || 0)}</td><td className="n">{R(r.cogs || 0)}</td><td className="n" style={{ color: 'var(--blu)' }}>{R(r.gross_profit || 0)}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  )
}

function SalesBreak({ agg, items, catMix }) {
  const sorted = [...items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount)
  return (
    <>
      <div className="krow">
        <Stat c="a" l="Qty Purchased" v={agg.qtyPurchased.toLocaleString('en-IN')} />
        <Stat c="g" l="Qty Sold" v={agg.qtySold.toLocaleString('en-IN')} />
        <Stat c="b" l="Remaining Stock" v={agg.qtyRemaining.toLocaleString('en-IN')} />
        <Stat c="g" l="Revenue" v={R(agg.totSales)} />
      </div>
      <div className="card"><div className="ch"><h3>By category</h3></div>
        {catMix.map((c) => <div className="dr" key={c.cat}><span className="dl">{c.cat}</span><span className="dv g">{R(c.amount)}</span></div>)}
      </div>
      <div className="card"><div className="ch"><h3>Product breakdown</h3></div>
        <div className="tw"><table className="tbl">
          <thead><tr><th>Product</th><th className="n">Units</th><th className="n">Revenue</th><th className="n">Margin</th></tr></thead>
          <tbody>{sorted.map((i) => <tr key={i.name}><td>{i.name}</td><td className="n">{i.qty}</td><td className="n" style={{ color: 'var(--grn)' }}>{R(i.amount)}</td><td className="n">{i.margin}%</td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  )
}

function PurchaseRep({ mix, list, agg }) {
  return (
    <>
      <div className="krow"><Stat c="a" l="Total Purchases" v={R(agg.totPurch)} s={`${list.length} entries`} /></div>
      <div className="card"><div className="ch"><h3>By category</h3></div>
        {mix.length ? mix.map((m) => <div className="dr" key={m.category}><span className="dl">{m.category}</span><span className="dv a">{R(m.amount)}</span></div>) : <div className="notice">No purchases.</div>}
      </div>
      <div className="card"><div className="ch"><h3>Purchase history</h3></div>
        <div className="tw"><table className="tbl">
          <thead><tr><th>Date</th><th>Category</th><th className="n">Qty</th><th className="n">Amount</th><th>Paid from</th></tr></thead>
          <tbody>{[...list].reverse().map((p) => <tr key={p.id}><td>{p.purchase_date}</td><td>{p.category}</td><td className="n">{p.quantity || '—'}</td><td className="n" style={{ fontWeight: 700 }}>{R(p.amount)}</td><td>{p.paid_from || 'Cash'}</td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  )
}

function ExpenseRep({ mix, list, agg }) {
  return (
    <>
      <div className="krow"><Stat c="r" l="Total Expenses" v={R(agg.totExp)} s={`${list.length} entries · ${agg.expRatio}% of sales`} /></div>
      <div className="card"><div className="ch"><h3>By reason</h3></div>
        {mix.length ? mix.map((m) => <div className="dr" key={m.reason}><span className="dl">{m.reason}</span><span className="dv r">{R(m.amount)}</span></div>) : <div className="notice">No expenses.</div>}
      </div>
      <div className="card"><div className="ch"><h3>Expense history</h3></div>
        <div className="tw"><table className="tbl">
          <thead><tr><th>Date</th><th>Reason</th><th className="n">Amount</th><th>Paid from</th></tr></thead>
          <tbody>{[...list].reverse().map((e) => <tr key={e.id}><td>{e.expense_date}</td><td>{e.category}</td><td className="n" style={{ color: 'var(--red)', fontWeight: 700 }}>{R(e.amount)}</td><td>{e.paid_from || 'Cash'}</td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  )
}

function PnL({ agg }) {
  return <div className="card"><div className="ch"><h3>Profit & Loss statement</h3></div><PnLRows agg={agg} /></div>
}

function Overall({ agg, balances, currentBalance, payMix, items }) {
  const top = [...items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5)
  return (
    <>
      <div className="krow">
        <Stat c="g" l="Total Income" v={R(agg.totIncome)} />
        <Stat c="r" l="Total Expense" v={R(agg.totExp)} />
        <Stat c="a" l="Purchases" v={R(agg.totPurch)} />
        <Stat c={agg.net >= 0 ? 'b' : 'r'} l="Net Profit" v={R(agg.net)} />
        <Stat c="b" l="Current Balance" v={R(currentBalance)} />
      </div>
      <div className="g2">
        <div className="card"><div className="ch"><h3>Profit & loss</h3></div><PnLRows agg={agg} /></div>
        <div className="card"><div className="ch"><h3>Balances & collection</h3></div>
          {balances.map((b) => <div className="dr" key={b.account}><span className="dl">{b.account}</span><span className="dv b">{R(b.balance)}</span></div>)}
          <div className="dr tot"><span className="dl">Total on hand</span><span className="dv b">{R(currentBalance)}</span></div>
          {payMix.map((p) => <div className="dr" key={p.account}><span className="dl" style={{ color: 'var(--t2)' }}>Collected · {p.account}</span><span className="dv">{R(p.amount)}</span></div>)}
        </div>
      </div>
      <div className="card"><div className="ch"><h3>Top products</h3></div>
        {top.map((i) => <div className="dr" key={i.name}><span className="dl">{i.name}</span><span className="dv g">{R(i.amount)}</span></div>)}
      </div>
    </>
  )
}
