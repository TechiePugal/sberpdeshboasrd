import { useState, useMemo } from 'react'
import {
  Chart as ChartJS, ArcElement, BarElement, PointElement, LineElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { useData } from '../context/DataContext'
import { filterRange, R } from '../lib/helpers'
import {
  aggregate, mergeItems, categoryMix, computeBalances, buildRecommendations,
} from '../lib/reports'
import FilterBar from '../components/FilterBar'
import Recommendations from '../components/Recommendations'

ChartJS.register(ArcElement, BarElement, PointElement, LineElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)
const COLORS = ['#0071e3', '#1a9e4b', '#b25e00', '#d70015', '#8944ab', '#00a3a3', '#e8590c', '#c2255c', '#1098ad', '#5f3dc4']
const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

export default function Dashboard({ onNav }) {
  const { reports, expenses, purchases, suspense, deposits, withdrawals, config, filter, loading } = useData()
  const [showRecs, setShowRecs] = useState(false)

  const fr = filterRange(reports, 'entry_date', filter)
  const fe = filterRange(expenses, 'expense_date', filter)
  const fp = filterRange(purchases, 'purchase_date', filter)
  const fsus = filterRange(suspense, 'suspense_date', filter)
  const agg = useMemo(() => aggregate(fr, fe, fp, config, filter, fsus), [fr, fe, fp, config, filter, fsus])
  const items = useMemo(() => mergeItems(fr), [fr])
  const catMix = useMemo(() => categoryMix(fr), [fr])
  const balances = useMemo(() => computeBalances(config, { reports, purchases, expenses, deposits, withdrawals }, filter), [config, reports, purchases, expenses, deposits, withdrawals, filter])
  const recs = useMemo(() => buildRecommendations(agg, items, fe), [agg, items, fe])
  const currentBalance = balances.reduce((a, b) => a + b.balance, 0)

  if (loading) return <div className="notice">Loading data…</div>

  if (reports.length === 0 && agg.leaseIncome === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 44 }}>📊</div>
        <h3 style={{ margin: '12px 0 6px' }}>No data yet</h3>
        <p style={{ color: 'var(--t2)', fontSize: 13, marginBottom: 18 }}>Upload your first daily report to see analytics.</p>
        <button className="btn bf" onClick={() => onNav('upload')}>⚡ Upload a report</button>
      </div>
    )
  }

  const topSellers = items.filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 8)

  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — Business Report</h2><div>{filter.label} · {filter.from} to {filter.to}</div></div>

      <div className="card no-print">
        <div className="ch">
          <h3>Dashboard</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn bo btn-sm" onClick={() => window.print()}>📄 Report</button>
            <button className="btn bf btn-sm" onClick={() => setShowRecs(true)}>💡 Insights</button>
          </div>
        </div>
        <FilterBar />
        {agg.leaseModules.length > 0 && (
          <div className="info-box" style={{ marginTop: 10 }}>🔑 Lease Mode — {agg.leaseModules.join(', ')} at {R(agg.leaseDay)}/day × {agg.workingDays} working day(s) = {R(agg.leaseIncome)}.</div>
        )}
      </div>

      {/* Headline */}
      <div className="krow">
        <div className="kc g"><div className="kl">Total Income</div><div className="kv">{R(agg.totIncome)}</div><div className="ks">{agg.leaseIncome ? 'sales + lease' : 'sales revenue'}</div></div>
        <div className="kc r"><div className="kl">Total Expense</div><div className="kv">{R(agg.totExp)}</div><div className="ks">{agg.expRatio}% of sales</div></div>
        <div className="kc b"><div className="kl">Current Balance</div><div className="kv">{R(currentBalance)}</div><div className="ks">cash + bank, as of {filter.to}</div></div>
      </div>

      {/* Profit line */}
      <div className="krow">
        <div className="kc a"><div className="kl">COGS</div><div className="kv">{R(agg.totCogs)}</div><div className="ks">cost of goods</div></div>
        <div className="kc b"><div className="kl">Gross Profit</div><div className="kv">{R(agg.gross)}</div><div className="ks">{agg.gpm}% margin</div></div>
        {agg.leaseIncome > 0 && <div className="kc p"><div className="kl">Lease Income</div><div className="kv">{R(agg.leaseIncome)}</div><div className="ks">month-end</div></div>}
        <div className={'kc ' + (agg.net >= 0 ? 'g' : 'r')}><div className="kl">Net Profit</div><div className="kv">{R(agg.net)}</div><div className="ks">{agg.reduceSuspense ? 'after suspense' : 'incl. lease'}</div></div>
        <div className="kc a"><div className="kl">Purchases</div><div className="kv">{R(agg.totPurch)}</div><div className="ks">this period</div></div>
        <div className="kc p"><div className="kl">Suspense {agg.reduceSuspense ? '(reducing)' : '(ignored)'}</div><div className="kv">{R(agg.totSuspense)}</div><div className="ks">{agg.reduceSuspense ? 'cut at month-end' : 'toggle in Settings'}</div></div>
      </div>

      {/* Balances */}
      <div className="card">
        <div className="ch"><h3>💰 Cash & Bank balances</h3><small style={{ color: 'var(--t2)' }}>as of {filter.to}</small></div>
        <div className="krow">
          {balances.map((b) => (
            <div className={'kc ' + (b.balance >= 0 ? 'g' : 'r')} key={b.account}>
              <div className="kl">{b.account}</div><div className="kv">{R(b.balance)}</div>
              <div className="ks">in {R(b.periodIn)} · out {R(b.periodOut)}</div>
            </div>
          ))}
          <div className="kc b"><div className="kl">Total on hand</div><div className="kv">{R(currentBalance)}</div><div className="ks">all accounts</div></div>
        </div>
      </div>

      {agg.trend.length > 1 && (
        <div className="card">
          <div className="ch"><h3>Sales & gross profit trend</h3></div>
          <div style={{ height: 240 }}>
            <Line data={{ labels: agg.trend.map((t) => t.date.slice(5)), datasets: [
              { label: 'Sales', data: agg.trend.map((t) => t.sales), borderColor: '#0071e3', backgroundColor: '#0071e322', fill: true, tension: 0.3 },
              { label: 'Gross', data: agg.trend.map((t) => t.gross), borderColor: '#1a9e4b', backgroundColor: '#1a9e4b22', fill: true, tension: 0.3 },
            ] }} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'bottom' } } }} />
          </div>
        </div>
      )}

      <div className="g2">
        <div className="card">
          <div className="ch"><h3>Top selling items</h3><button className="btn bo btn-xs no-print" onClick={() => onNav('profit')}>View all →</button></div>
          {topSellers.length ? (
            <div style={{ height: 280 }}>
              <Bar data={{ labels: topSellers.map((i) => i.name), datasets: [{ data: topSellers.map((i) => i.amount), backgroundColor: '#0071e3', borderRadius: 6 }] }} options={{ ...chartOpts, indexAxis: 'y' }} />
            </div>
          ) : <div className="notice">No item-level sales</div>}
        </div>
        <div className="card">
          <div className="ch"><h3>Sales by category</h3></div>
          {catMix.length ? (
            <div style={{ height: 280, display: 'grid', placeItems: 'center' }}>
              <Doughnut data={{ labels: catMix.map((c) => c.cat), datasets: [{ data: catMix.map((c) => c.amount), backgroundColor: COLORS, borderWidth: 0 }] }} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'right' } } }} />
            </div>
          ) : <div className="notice">No category data</div>}
        </div>
      </div>

      <div className="card">
        <div className="ch"><h3>Profit & loss</h3><button className="btn bo btn-xs no-print" onClick={() => onNav('reports')}>Full reports →</button></div>
        <div className="dr"><span className="dl">Total Sales</span><span className="dv g">{R(agg.totSales)}</span></div>
        <div className="dr"><span className="dl">Less: COGS</span><span className="dv a">{R(agg.totCogs)}</span></div>
        <div className="dr tot"><span className="dl">Gross Profit</span><span className="dv b">{R(agg.gross)}</span></div>
        {agg.leaseIncome > 0 && <div className="dr"><span className="dl">Add: Lease income</span><span className="dv g">{R(agg.leaseIncome)}</span></div>}
        <div className="dr"><span className="dl">Less: Expenses</span><span className="dv r">{R(agg.totExp)}</span></div>
        {agg.reduceSuspense && <div className="dr"><span className="dl">Less: Suspense (month-end)</span><span className="dv r">{R(agg.totSuspense)}</span></div>}
        <div className="dr tot"><span className="dl">Net Profit</span><span className={'dv ' + (agg.net >= 0 ? 'g' : 'r')}>{R(agg.net)}</span></div>
      </div>

      <Recommendations open={showRecs} onClose={() => setShowRecs(false)} recs={recs} rangeLabel={filter.label} />
    </>
  )
}
