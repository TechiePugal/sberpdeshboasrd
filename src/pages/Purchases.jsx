import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange, todayStr, PURCHASE_CATEGORIES } from '../lib/helpers'
import { purchaseMix } from '../lib/reports'
import FilterBar from '../components/FilterBar'

const CAT_ICON = { 'TASMAC Bill': '🍾', Cooldrinks: '🥤', Cigarettes: '🚬', Kitchen: '🍳' }

export default function Purchases() {
  const { uid, purchases, config, filter, refresh } = useData()
  const { toast, confirm } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']
  const payOptions = [...accounts, 'Credit']

  const [form, setForm] = useState({ purchase_date: todayStr(), category: PURCHASE_CATEGORIES[0], quantity: '', rate: '', amount: '', paid_from: accounts[0], notes: '' })
  const [busy, setBusy] = useState(false)

  // auto amount = qty × rate when both present
  const autoAmount = (form.quantity && form.rate) ? (parseFloat(form.quantity) * parseFloat(form.rate)) : null
  const effAmount = autoAmount != null ? autoAmount : parseFloat(form.amount) || 0

  const fp = filterRange(purchases, 'purchase_date', filter).slice().reverse()
  const mix = useMemo(() => purchaseMix(fp), [fp])
  const total = fp.reduce((a, p) => a + (Number(p.amount) || 0), 0)
  const totalQty = fp.reduce((a, p) => a + (Number(p.quantity) || 0), 0)

  async function add() {
    if (effAmount <= 0) return toast('Enter amount (or qty × rate)', true)
    setBusy(true)
    try {
      await api.addPurchase(uid, {
        purchase_date: form.purchase_date, category: form.category,
        quantity: parseFloat(form.quantity) || 0, rate: parseFloat(form.rate) || 0,
        amount: effAmount, paid_from: form.paid_from, notes: form.notes || '', created_at: Date.now(),
      })
      toast('✓ Purchase added')
      setForm((f) => ({ ...f, quantity: '', rate: '', amount: '', notes: '' }))
      await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
    setBusy(false)
  }
  function del(p) {
    confirm('Delete purchase?', `${p.category} · ${R(p.amount)} on ${p.purchase_date}?`, async () => {
      try { await api.deletePurchase(uid, p.id); toast('Deleted'); await refresh() }
      catch (e) { toast('Error: ' + e.message, true) }
    })
  }

  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — Purchases</h2><div>{filter.label} · {filter.from} to {filter.to}</div></div>

      <div className="card">
        <div className="ch"><h3>➕ Add purchase</h3></div>
        <div className="fg3">
          <div className="ff"><label>Date</label><input type="date" value={form.purchase_date} onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))} /></div>
          <div className="ff"><label>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{PURCHASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="ff"><label>Quantity</label><input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="0" /></div>
          <div className="ff"><label>Rate / unit (₹)</label><input type="number" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} placeholder="0" /></div>
          <div className="ff"><label>Amount (₹){autoAmount != null && <span style={{ color: 'var(--t2)', fontWeight: 400 }}> · auto</span>}</label>
            <input type="number" value={autoAmount != null ? autoAmount : form.amount} disabled={autoAmount != null} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
          <div className="ff"><label>Paid from</label>
            <select value={form.paid_from} onChange={(e) => setForm((f) => ({ ...f, paid_from: e.target.value }))}>{payOptions.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="ff" style={{ gridColumn: 'span 3' }}><label>Notes (bill no, supplier…)</label><input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <div style={{ marginTop: 12 }}><button className="btn bf" disabled={busy} onClick={add}>{busy ? 'Adding…' : '+ Add purchase'}</button></div>
      </div>

      <div className="card no-print">
        <div className="ch"><h3>Purchases</h3><small style={{ color: 'var(--t2)' }}>{fp.length} entries · {totalQty} units · {R(total)}</small></div>
        <FilterBar />
      </div>

      {mix.length > 0 && (
        <div className="krow">{mix.map((m) => <div className="kc a" key={m.category}><div className="kl">{CAT_ICON[m.category] || ''} {m.category}</div><div className="kv">{R(m.amount)}</div></div>)}</div>
      )}

      <div className="card">
        {fp.length === 0 ? <div className="notice" style={{ padding: 24 }}>No purchases in this range.</div> : (
          <div className="tw"><table className="tbl">
            <thead><tr><th>Date</th><th>Category</th><th className="n">Qty</th><th className="n">Rate</th><th className="n">Amount</th><th>Paid from</th><th>Notes</th><th></th></tr></thead>
            <tbody>{fp.map((p) => (
              <tr key={p.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{p.purchase_date}</td>
                <td>{CAT_ICON[p.category] || ''} {p.category}</td>
                <td className="n">{p.quantity || '—'}</td>
                <td className="n">{p.rate ? R(p.rate) : '—'}</td>
                <td className="n" style={{ fontWeight: 700 }}>{R(p.amount)}</td>
                <td><span className={'badge ' + (p.paid_from === 'Credit' ? 'br-b' : 'bb')}>{p.paid_from || 'Cash'}</span></td>
                <td style={{ color: 'var(--t2)', fontSize: 12 }}>{p.notes || '—'}</td>
                <td><button className="btn br btn-xs" onClick={() => del(p)}>Del</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
