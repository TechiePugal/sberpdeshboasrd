import { useMemo, useState } from 'react'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useData } from '../context/DataContext'
import { filterRange, R } from '../lib/helpers'
import { aggregate, mergeItems } from '../lib/reports'
import FilterBar from '../components/FilterBar'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)
const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

const SORTS = [
  { k: 'profit', label: 'Profit' },
  { k: 'amount', label: 'Revenue' },
  { k: 'qty', label: 'Units sold' },
  { k: 'margin', label: 'Margin %' },
]

export default function Profit() {
  const { reports, expenses, purchases, suspense, config, filter } = useData()
  const [sortK, setSortK] = useState('profit')

  const fr = filterRange(reports, 'entry_date', filter)
  const fe = filterRange(expenses, 'expense_date', filter)
  const fp = filterRange(purchases, 'purchase_date', filter)
  const fsus = filterRange(suspense, 'suspense_date', filter)
  const agg = useMemo(() => aggregate(fr, fe, fp, config, filter, fsus), [fr, fe, fp, config, filter, fsus])

  const items = useMemo(() => mergeItems(fr).map((i) => ({ ...i, profit: Math.round((i.sRate - i.pRate) * i.qty) })), [fr])
  const sorted = useMemo(() => [...items].filter((i) => i.qty > 0).sort((a, b) => (b[sortK] || 0) - (a[sortK] || 0)), [items, sortK])
  const totProfit = items.reduce((a, i) => a + i.profit, 0)
  const top = [...items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 10)

  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — Sales & Profit</h2><div>{filter.label} · {filter.from} to {filter.to}</div></div>

      <div className="card no-print">
        <div className="ch"><h3>Sales & Profit</h3><button className="btn bo btn-sm" onClick={() => window.print()}>📄 Print</button></div>
        <FilterBar />
      </div>

      <div className="krow">
        <div className="kc a"><div className="kl">Qty Purchased</div><div className="kv">{agg.qtyPurchased.toLocaleString('en-IN')}</div><div className="ks">units in (period)</div></div>
        <div className="kc g"><div className="kl">Qty Sold</div><div className="kv">{agg.qtySold.toLocaleString('en-IN')}</div><div className="ks">units out</div></div>
        <div className="kc b"><div className="kl">Remaining Stock</div><div className="kv">{agg.qtyRemaining.toLocaleString('en-IN')}</div><div className="ks">closing units</div></div>
      </div>
      <div className="krow">
        <div className="kc g"><div className="kl">Revenue</div><div className="kv">{R(agg.totSales)}</div></div>
        <div className="kc a"><div className="kl">COGS</div><div className="kv">{R(agg.totCogs)}</div></div>
        <div className="kc b"><div className="kl">Gross Profit</div><div className="kv">{R(agg.gross)}</div><div className="ks">{agg.gpm}% margin</div></div>
        <div className="kc p"><div className="kl">Stock at cost</div><div className="kv">{R(agg.closingStockCost)}</div></div>
      </div>

      <div className="card">
        <div className="ch"><h3>Top products by revenue</h3></div>
        {top.length ? (
          <div style={{ height: 320 }}>
            <Bar data={{ labels: top.map((i) => i.name), datasets: [{ data: top.map((i) => i.amount), backgroundColor: '#0071e3', borderRadius: 6 }] }} options={{ ...chartOpts, indexAxis: 'y' }} />
          </div>
        ) : <div className="notice">No item-level sales in this period.</div>}
      </div>

      <div className="card">
        <div className="ch">
          <h3>Sales breakdown ({sorted.length} products)</h3>
          <select value={sortK} onChange={(e) => setSortK(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}>
            {SORTS.map((s) => <option key={s.k} value={s.k}>Sort: {s.label}</option>)}
          </select>
        </div>
        {sorted.length === 0 ? <div className="notice">No sales data.</div> : (
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>Product</th><th>Category</th><th className="n">Units sold</th><th className="n">Revenue</th><th className="n">Margin</th><th className="n">Profit</th><th className="n">Closing</th></tr></thead>
              <tbody>
                {sorted.map((it) => (
                  <tr key={it.name}>
                    <td style={{ fontWeight: 600 }}>{it.name}</td>
                    <td style={{ color: 'var(--t2)' }}>{it.cat}</td>
                    <td className="n">{it.qty}</td>
                    <td className="n" style={{ color: 'var(--grn)', fontWeight: 700 }}>{R(it.amount)}</td>
                    <td className="n">{it.margin}%</td>
                    <td className="n" style={{ color: 'var(--blu)', fontWeight: 700 }}>{R(it.profit)}</td>
                    <td className="n" style={{ color: 'var(--t2)' }}>{R(it.closing)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ fontWeight: 700 }}><td colSpan="3">Total</td><td className="n" style={{ color: 'var(--grn)' }}>{R(agg.totSales)}</td><td className="n">{agg.gpm}%</td><td className="n" style={{ color: 'var(--blu)' }}>{R(totProfit)}</td><td></td></tr></tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
