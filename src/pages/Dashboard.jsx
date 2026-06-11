import { useState, useMemo } from 'react'
import {
  Chart as ChartJS, ArcElement, BarElement, PointElement, LineElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { useData } from '../context/DataContext'
import { filterRange, R } from '../lib/helpers'
import { defaultRange } from '../lib/ranges'
import {
  aggregate, mergeItems, categoryMix, expenseMix, purchaseMix,
  paymentMix, computeBalances, buildRecommendations,
} from '../lib/reports'
import RangePicker from '../components/RangePicker'
import Recommendations from '../components/Recommendations'

ChartJS.register(ArcElement, BarElement, PointElement, LineElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

const COLORS = ['#0071e3', '#1a9e4b', '#b25e00', '#d70015', '#8944ab', '#00a3a3', '#e8590c', '#c2255c', '#1098ad', '#5f3dc4']
const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

export default function Dashboard({ onNav }) {
  const { reports, expenses, purchases, suspense, config, loading } = useData()
  const [range, setRange] = useState(defaultRange())
  const [showRecs, setShowRecs] = useState(false)

  const fr = filterRange(reports, 'entry_date', range)
  const fe = filterRange(expenses, 'expense_date', range)
  const fp = filterRange(purchases, 'purchase_date', range)
  const fsus = filterRange(suspense, 'suspense_date', range)
  const agg = useMemo(() => aggregate(fr, fe, fp, config, range, fsus), [fr, fe, fp, config, range, fsus])
  const items = useMemo(() => mergeItems(fr), [fr])
  const catMix = useMemo(() => categoryMix(fr), [fr])
  const expMix = useMemo(() => expenseMix(fe), [fe])
  const purMix = useMemo(() => purchaseMix(fp), [fp])
  const payMix = useMemo(() => paymentMix(fr), [fr])
  // balances are shown as of the end of the selected range; in/out are per-period
  const balances = useMemo(() => computeBalances(config, reports, purchases, expenses, range), [config, reports, purchases, expenses, range])
  const recs = useMemo(() => buildRecommendations(agg, items, fe), [agg, items, fe])

  if (loading) return <div className="notice">Loading data…</div>

  if (reports.length === 0 && agg.leaseIncome === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 44 }}>📊</div>
        <h3 style={{ margin: '12px 0 6px' }}>No reports yet</h3>
        <p style={{ color: 'var(--t2)', fontSize: 13, marginBottom: 18 }}>Upload your first daily stock + sales PDF to see analytics and recommendations.</p>
        <button className="btn bf" onClick={() => onNav('upload')}>⚡ Upload a report</button>
      </div>
    )
  }

  const topSellers = items.filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 8)

  return (
    <>
      <div className="print-head">
        <h2>Siruvani Bar — Business Report</h2>
        <div>{range.label} · {range.from} to {range.to}</div>
      </div>

      <div className="card no-print">
        <div className="ch">
          <h3>Analytics dashboard</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn bo btn-sm" onClick={() => window.print()}>📄 Report</button>
            <button className="btn bf btn-sm" onClick={() => setShowRecs(true)}>💡 Recommendations</button>
          </div>
        </div>
        <RangePicker range={range} onChange={setRange} />
        {agg.leaseModules.length > 0 && (
          <div className="info-box" style={{ marginTop: 10 }}>🔑 Lease Mode on — {agg.leaseModules.join(', ')} leased at {R(agg.leaseDay)}/day.</div>
        )}
      </div>

      <div className="krow">
        <Kpi c="g" l="Total Sales" v={R(agg.totSales)} s={`${agg.days} day(s)`} />
        <Kpi c="a" l="COGS" v={R(agg.totCogs)} s="cost of goods" />
        <Kpi c="b" l="Gross Profit" v={R(agg.gross)} s={`${agg.gpm}% margin`} />
        <Kpi c="r" l="Expenses" v={R(agg.totExp)} s={`${agg.expRatio}% of sales`} />
        <Kpi c={agg.net >= 0 ? 'g' : 'r'} l="Net Profit" v={R(agg.net)} s={agg.leaseIncome ? 'incl. lease' : `${agg.npm}% margin`} />
      </div>
      <div className="krow">
        {agg.leaseIncome > 0 && <Kpi c="p" l="Lease Income" v={R(agg.leaseIncome)} s={`${R(agg.leaseDay)}/day`} />}
        <Kpi c="p" l="Suspense (not in hand)" v={R(agg.totSuspense)} s="booked, awaited" />
        <Kpi c={agg.cashInHand >= 0 ? 'b' : 'r'} l="Expected Cash in Hand" v={R(agg.cashInHand)} s="sales − suspense − exp" />
        <Kpi c="a" l="Purchases" v={R(agg.totPurch)} s="this period" />
        <Kpi c="a" l="Stock at Cost" v={R(agg.closingStockCost)} s="working capital" />
      </div>

      {/* Running balances */}
      <div className="card">
        <div className="ch"><h3>💰 Cash & Bank balances</h3><small style={{ color: 'var(--t2)' }}>as of {range.to}</small></div>
        <div className="krow">
          {balances.map((b) => (
            <div className={'kc ' + (b.balance >= 0 ? 'g' : 'r')} key={b.account}>
              <div className="kl">{b.account}</div>
              <div className="kv">{R(b.balance)}</div>
              <div className="ks">in {R(b.periodIn)} · out {R(b.periodOut)}</div>
            </div>
          ))}
          <div className="kc b"><div className="kl">Total on hand</div><div className="kv">{R(balances.reduce((a, b) => a + b.balance, 0))}</div><div className="ks">all accounts</div></div>
        </div>
      </div>

      {agg.trend.length > 1 && (
        <div className="card">
          <div className="ch"><h3>Sales & gross profit trend</h3></div>
          <div style={{ height: 240 }}>
            <Line data={{
              labels: agg.trend.map((t) => t.date.slice(5)),
              datasets: [
                { label: 'Sales', data: agg.trend.map((t) => t.sales), borderColor: '#0071e3', backgroundColor: '#0071e322', fill: true, tension: 0.3 },
                { label: 'Gross profit', data: agg.trend.map((t) => t.gross), borderColor: '#1a9e4b', backgroundColor: '#1a9e4b22', fill: true, tension: 0.3 },
              ],
            }} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'bottom' } } }} />
          </div>
        </div>
      )}

      <div className="g2">
        <div className="card">
          <div className="ch"><h3>Top selling items</h3></div>
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

      <div className="g2">
        <div className="card">
          <div className="ch"><h3>Collection by mode</h3><small style={{ color: 'var(--t2)' }}>cash vs bank/UPI</small></div>
          {payMix.length ? payMix.map((p) => (
            <div className="dr" key={p.account}><span className="dl">{p.account}</span><span className="dv b">{R(p.amount)}</span></div>
          )) : <div className="notice">Enter the day-end split on the Upload screen.</div>}
        </div>
        <div className="card">
          <div className="ch"><h3>Purchases by category</h3></div>
          {purMix.length ? (
            <>
              {purMix.map((p) => <div className="dr" key={p.category}><span className="dl">{p.category}</span><span className="dv a">{R(p.amount)}</span></div>)}
              <div className="dr tot"><span className="dl">Total</span><span className="dv a">{R(agg.totPurch)}</span></div>
            </>
          ) : <div className="notice">No purchases. Add them on the Purchases page.</div>}
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="ch"><h3>Profit & loss summary</h3></div>
          <div className="dr"><span className="dl">Total Sales</span><span className="dv g">{R(agg.totSales)}</span></div>
          <div className="dr"><span className="dl">Less: COGS</span><span className="dv a">{R(agg.totCogs)}</span></div>
          <div className="dr tot"><span className="dl">Gross Profit</span><span className="dv b">{R(agg.gross)}</span></div>
          {agg.leaseIncome > 0 && <div className="dr"><span className="dl">Add: Lease income</span><span className="dv g">{R(agg.leaseIncome)}</span></div>}
          <div className="dr"><span className="dl">Less: Expenses</span><span className="dv r">{R(agg.totExp)}</span></div>
          <div className="dr tot"><span className="dl">Net Profit</span><span className={'dv ' + (agg.net >= 0 ? 'g' : 'r')}>{R(agg.net)}</span></div>
        </div>
        <div className="card">
          <div className="ch"><h3>Expenses by reason</h3></div>
          {expMix.length ? (
            <>
              {expMix.slice(0, 8).map((e) => <div className="dr" key={e.reason}><span className="dl">{e.reason}</span><span className="dv r">{R(e.amount)}</span></div>)}
              <div className="dr tot"><span className="dl">Total</span><span className="dv r">{R(agg.totExp)}</span></div>
            </>
          ) : <div className="notice">No expenses recorded. Add them on the Expenses page.</div>}
        </div>
      </div>

      <Recommendations open={showRecs} onClose={() => setShowRecs(false)} recs={recs} rangeLabel={range.label} />
    </>
  )
}

function Kpi({ c, l, v, s }) {
  return (
    <div className={'kc ' + c}>
      <div className="kl">{l}</div>
      <div className="kv">{v}</div>
      <div className="ks">{s}</div>
    </div>
  )
}
