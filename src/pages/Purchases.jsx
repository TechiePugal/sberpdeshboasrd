import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange, todayStr, PURCHASE_CATEGORIES } from '../lib/helpers'
import { purchaseMix } from '../lib/reports'
import { defaultRange } from '../lib/ranges'
import RangePicker from '../components/RangePicker'

const CAT_ICON = { 'TASMAC Bill': '🍾', Cooldrinks: '🥤', Cigarettes: '🚬', Kitchen: '🍳' }

export default function Purchases() {
  const { uid, purchases, config, refresh } = useData()
  const { toast, confirm } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']
  const payOptions = [...accounts, 'Credit']

  const [range, setRange] = useState(defaultRange())
  const [form, setForm] = useState({ purchase_date: todayStr(), category: PURCHASE_CATEGORIES[0], amount: '', paid_from: accounts[0], notes: '' })
  const [busy, setBusy] = useState(false)

  const fp = filterRange(purchases, 'purchase_date', range).slice().reverse()
  const mix = useMemo(() => purchaseMix(fp), [fp])
  const total = fp.reduce((a, p) => a + (Number(p.amount) || 0), 0)

  async function add() {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast('Enter an amount', true)
    setBusy(true)
    try {
      await api.addPurchase(uid, {
        purchase_date: form.purchase_date,
        category: form.category,
        amount: parseFloat(form.amount),
        paid_from: form.paid_from,
        notes: form.notes || '',
        created_at: Date.now(),
      })
      toast('✓ Purchase added')
      setForm((f) => ({ ...f, amount: '', notes: '' }))
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
      <div className="card">
        <div className="ch"><h3>Add purchase</h3></div>
        <div className="fg3">
          <div className="ff"><label>Date</label><input type="date" value={form.purchase_date} onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))} /></div>
          <div className="ff"><label>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {PURCHASE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div className="ff"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
          <div className="ff"><label>Paid from</label>
            <select value={form.paid_from} onChange={(e) => setForm((f) => ({ ...f, paid_from: e.target.value }))}>
              {payOptions.map((a) => <option key={a}>{a}</option>)}
            </select></div>
          <div className="ff" style={{ gridColumn: 'span 2' }}><label>Notes (optional)</label><input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="bill no, supplier…" /></div>
        </div>
        <div style={{ marginTop: 12 }}><button className="btn bf" disabled={busy} onClick={add}>{busy ? 'Adding…' : '+ Add purchase'}</button></div>
      </div>

      <div className="card no-print">
        <div className="ch"><h3>Purchases</h3><small style={{ color: 'var(--t2)' }}>{fp.length} entries · {R(total)}</small></div>
        <RangePicker range={range} onChange={setRange} />
      </div>

      {mix.length > 0 && (
        <div className="krow">
          {mix.map((m) => (
            <div className="kc a" key={m.category}><div className="kl">{CAT_ICON[m.category] || ''} {m.category}</div><div className="kv">{R(m.amount)}</div></div>
          ))}
        </div>
      )}

      <div className="card">
        {fp.length === 0 ? <div className="notice" style={{ padding: 24 }}>No purchases in this range.</div> : (
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Category</th><th className="n">Amount</th><th>Paid from</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {fp.map((p) => (
                  <tr key={p.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{p.purchase_date}</td>
                    <td>{CAT_ICON[p.category] || ''} {p.category}</td>
                    <td className="n" style={{ fontWeight: 700 }}>{R(p.amount)}</td>
                    <td><span className={'badge ' + (p.paid_from === 'Credit' ? 'br-b' : 'bb')}>{p.paid_from || 'Cash'}</span></td>
                    <td style={{ color: 'var(--t2)', fontSize: 12 }}>{p.notes || '—'}</td>
                    <td><button className="btn br btn-xs" onClick={() => del(p)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
