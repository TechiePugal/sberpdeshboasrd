import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { R } from '../lib/helpers'

const SORTS = [
  { k: 'closing_cost', label: 'Stock value (cost)' },
  { k: 'closing_qty', label: 'Quantity' },
  { k: 'closing', label: 'Stock value (sale)' },
  { k: 'name', label: 'Name' },
]

export default function CurrentStock() {
  const { reports } = useData()
  const [sortK, setSortK] = useState('closing_cost')
  const [q, setQ] = useState('')

  const latest = useMemo(() => [...reports].sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0] || null, [reports])
  const items = useMemo(() => {
    let list = (latest?.items || []).filter((i) => (i.closing_qty || 0) > 0 || (i.closing || 0) > 0)
    if (q.trim()) list = list.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
    return [...list].sort((a, b) => sortK === 'name' ? a.name.localeCompare(b.name) : (b[sortK] || 0) - (a[sortK] || 0))
  }, [latest, sortK, q])

  const totCost = items.reduce((a, i) => a + (i.closing_cost || 0), 0)
  const totSale = items.reduce((a, i) => a + (i.closing || 0), 0)
  const totQty = items.reduce((a, i) => a + (i.closing_qty || 0), 0)

  if (!latest) {
    return <div className="card" style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 40 }}>📦</div><h3 style={{ margin: '10px 0 6px' }}>No stock data</h3><p style={{ color: 'var(--t2)', fontSize: 13 }}>Upload a daily report to see current stock.</p></div>
  }

  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — Current Stock</h2><div>as of {latest.entry_date}</div></div>

      <div className="card no-print">
        <div className="ch"><h3>📦 Current stock available</h3><button className="btn bo btn-sm" onClick={() => window.print()}>📄 Print</button></div>
        <div className="info-box">Closing stock from the latest report (<strong>{latest.entry_date}</strong>) — quantity, purchase rate (P.Rate) and stock value at cost and at sale price.</div>
      </div>

      <div className="krow">
        <div className="kc b"><div className="kl">Stock value (cost)</div><div className="kv">{R(totCost)}</div><div className="ks">P.Rate basis</div></div>
        <div className="kc g"><div className="kl">Stock value (sale)</div><div className="kv">{R(totSale)}</div><div className="ks">S.Rate basis</div></div>
        <div className="kc a"><div className="kl">Total units</div><div className="kv">{totQty.toLocaleString('en-IN')}</div></div>
        <div className="kc p"><div className="kl">Items in stock</div><div className="kv">{items.length}</div></div>
      </div>

      <div className="card no-print">
        <div className="ch"><h3>Items</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--bd-strong)', borderRadius: 8, background: 'var(--surface)' }} />
            <select value={sortK} onChange={(e) => setSortK(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}>{SORTS.map((s) => <option key={s.k} value={s.k}>Sort: {s.label}</option>)}</select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>Item</th><th>Category</th><th className="n">Closing qty</th><th className="n">P.Rate</th><th className="n">S.Rate</th><th className="n">Value (cost)</th><th className="n">Value (sale)</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.name}>
                  <td style={{ fontWeight: 600 }}>{i.name}</td>
                  <td style={{ color: 'var(--t2)' }}>{i.cat}</td>
                  <td className="n" style={{ fontWeight: 700 }}>{i.closing_qty || 0}</td>
                  <td className="n">{R(i.pRate)}</td>
                  <td className="n">{R(i.sRate)}</td>
                  <td className="n" style={{ color: 'var(--blu)', fontWeight: 700 }}>{R(i.closing_cost || 0)}</td>
                  <td className="n" style={{ color: 'var(--grn)' }}>{R(i.closing || 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ fontWeight: 700 }}><td colSpan="2">Total</td><td className="n">{totQty}</td><td colSpan="2"></td><td className="n" style={{ color: 'var(--blu)' }}>{R(totCost)}</td><td className="n" style={{ color: 'var(--grn)' }}>{R(totSale)}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </>
  )
}
