import { useState, useMemo } from 'react'
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R } from '../lib/helpers'
import { categoryMix } from '../lib/reports'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
const COLORS = ['#0071e3', '#1a9e4b', '#b25e00', '#d70015', '#8944ab', '#00a3a3', '#e8590c', '#c2255c', '#1098ad', '#5f3dc4']
const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

const SORTS = [
  { k: 'amount', label: 'Sales value' },
  { k: 'qty', label: 'Units sold' },
  { k: 'margin', label: 'Margin %' },
  { k: 'closing', label: 'Closing stock' },
]

export default function ReportDetail({ onNav, initialDate }) {
  const { uid, reports, refresh } = useData()
  const { toast, confirm } = useUI()
  const [sortK, setSortK] = useState('amount')

  const report = reports.find((r) => r.entry_date === initialDate)

  const items = report?.items || []
  const sellers = useMemo(() => items.filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount), [items])
  const catMix = useMemo(() => (report ? categoryMix([report]) : []), [report])
  const allSorted = useMemo(() => [...items].sort((a, b) => (b[sortK] || 0) - (a[sortK] || 0)), [items, sortK])
  const collections = report?.day_end?.collections || {}
  const collEntries = Object.entries(collections).filter(([, v]) => v > 0)

  if (!report) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--t2)' }}>Report not found.</p>
        <button className="btn bf" onClick={() => onNav('records')}>← Back to records</button>
      </div>
    )
  }

  const margin = report.total_sales ? ((report.gross_profit / report.total_sales) * 100).toFixed(1) : 0
  const topSellers = sellers.slice(0, 10)

  function del() {
    confirm('Delete report?', `Delete the full report for ${report.entry_date}?`, async () => {
      try { await api.deleteDailyReport(uid, report.id); toast('Report deleted'); await refresh(); onNav('records') }
      catch (e) { toast('Error: ' + e.message, true) }
    })
  }

  return (
    <>
      <div className="print-head">
        <h2>Siruvani Bar — Daily Report</h2>
        <div>{report.entry_date}</div>
      </div>

      <div className="card no-print">
        <div className="ch">
          <h3>📅 Daily report — {report.entry_date}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn bo btn-sm" onClick={() => onNav('records')}>← Back</button>
            <button className="btn bo btn-sm" onClick={() => window.print()}>📄 Print</button>
            <button className="btn br btn-sm" onClick={del}>Delete</button>
          </div>
        </div>
      </div>

      <div className="krow">
        <div className="kc g"><div className="kl">Total Sales</div><div className="kv">{R(report.total_sales || 0)}</div><div className="ks">{report.total_qty_sold || 0} units</div></div>
        <div className="kc a"><div className="kl">COGS</div><div className="kv">{R(report.cogs || 0)}</div><div className="ks">cost of goods</div></div>
        <div className="kc b"><div className="kl">Gross Profit</div><div className="kv">{R(report.gross_profit || 0)}</div><div className="ks">{margin}% margin</div></div>
        <div className="kc p"><div className="kl">Items sold</div><div className="kv">{sellers.length}</div><div className="ks">distinct products</div></div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="ch"><h3>Top 10 products</h3></div>
          {topSellers.length ? (
            <div style={{ height: 300 }}>
              <Bar data={{ labels: topSellers.map((i) => i.name), datasets: [{ data: topSellers.map((i) => i.amount), backgroundColor: '#0071e3', borderRadius: 6 }] }} options={{ ...chartOpts, indexAxis: 'y' }} />
            </div>
          ) : <div className="notice">No item-level data</div>}
        </div>
        <div className="card">
          <div className="ch"><h3>Sales by category</h3></div>
          {catMix.length ? (
            <div style={{ height: 300, display: 'grid', placeItems: 'center' }}>
              <Doughnut data={{ labels: catMix.map((c) => c.cat), datasets: [{ data: catMix.map((c) => c.amount), backgroundColor: COLORS, borderWidth: 0 }] }} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'right' } } }} />
            </div>
          ) : <div className="notice">No category data</div>}
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="ch"><h3>Stock & purchases</h3></div>
          <div className="dr"><span className="dl">Opening stock (cost)</span><span className="dv">{R(report.opening_stock_cost || 0)}</span></div>
          <div className="dr"><span className="dl">Purchases (cost)</span><span className="dv a">{R(report.purchase_cost || 0)}</span></div>
          <div className="dr"><span className="dl">Closing stock (cost)</span><span className="dv">{R(report.closing_stock_cost || 0)}</span></div>
          <div className="dr"><span className="dl">Closing stock (sale value)</span><span className="dv">{R(report.closing_stock_sale_value || 0)}</span></div>
          <div className="dr tot"><span className="dl">Gross margin</span><span className="dv b">{margin}%</span></div>
        </div>
        <div className="card">
          <div className="ch"><h3>💵 Day-end collection</h3></div>
          {collEntries.length ? (
            <>
              <div style={{ height: 180, display: 'grid', placeItems: 'center', marginBottom: 8 }}>
                <Doughnut data={{ labels: collEntries.map(([a]) => a), datasets: [{ data: collEntries.map(([, v]) => v), backgroundColor: COLORS, borderWidth: 0 }] }} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'right' } } }} />
              </div>
              {collEntries.map(([acct, v]) => <div className="dr" key={acct}><span className="dl">{acct}</span><span className="dv b">{R(v)}</span></div>)}
            </>
          ) : <div className="notice">No day-end split saved for this day.</div>}
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <h3>All products ({items.length})</h3>
          <select value={sortK} onChange={(e) => setSortK(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}>
            {SORTS.map((s) => <option key={s.k} value={s.k}>Sort: {s.label}</option>)}
          </select>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>Product</th><th>Category</th><th className="n">Qty</th><th className="n">Sales</th><th className="n">Margin</th><th className="n">Closing</th></tr></thead>
            <tbody>
              {allSorted.map((it) => (
                <tr key={it.name}>
                  <td style={{ fontWeight: 600 }}>{it.name}</td>
                  <td style={{ color: 'var(--t2)' }}>{it.cat}</td>
                  <td className="n">{it.qty}</td>
                  <td className="n" style={{ color: 'var(--grn)', fontWeight: 700 }}>{R(it.amount)}</td>
                  <td className="n">{it.margin}%</td>
                  <td className="n" style={{ color: 'var(--t2)' }}>{R(it.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
