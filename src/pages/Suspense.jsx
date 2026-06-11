import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange, todayStr } from '../lib/helpers'
import { defaultRange } from '../lib/ranges'
import RangePicker from '../components/RangePicker'

export default function Suspense() {
  const { uid, suspense, refresh } = useData()
  const { toast, confirm } = useUI()
  const [range, setRange] = useState(defaultRange())
  const [form, setForm] = useState({ suspense_date: todayStr(), amount: '', reason: '' })
  const [busy, setBusy] = useState(false)

  const fs = filterRange(suspense, 'suspense_date', range).slice().reverse()
  const total = useMemo(() => fs.reduce((a, s) => a + (Number(s.amount) || 0), 0), [fs])

  async function add() {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast('Enter an amount', true)
    if (!form.reason.trim()) return toast('Add a reason', true)
    setBusy(true)
    try {
      await api.addSuspense(uid, {
        suspense_date: form.suspense_date,
        amount: parseFloat(form.amount),
        reason: form.reason.trim(),
        created_at: Date.now(),
      })
      toast('✓ Suspense added')
      setForm((f) => ({ ...f, amount: '', reason: '' }))
      await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
    setBusy(false)
  }
  function del(s) {
    confirm('Delete entry?', `${R(s.amount)} on ${s.suspense_date}?`, async () => {
      try { await api.deleteSuspense(uid, s.id); toast('Deleted'); await refresh() }
      catch (e) { toast('Error: ' + e.message, true) }
    })
  }

  return (
    <>
      <div className="card">
        <div className="ch"><h3>⏳ Add suspense</h3><small style={{ color: 'var(--t2)' }}>money booked but not in hand</small></div>
        <div className="info-box">Use this for amounts that are in the books but <strong>not in cash</strong> yet — credit given to a customer, a pending UPI/bank transfer, etc. It lowers your expected cash-in-hand without changing profit.</div>
        <div className="fg3">
          <div className="ff"><label>Date</label><input type="date" value={form.suspense_date} onChange={(e) => setForm((f) => ({ ...f, suspense_date: e.target.value }))} /></div>
          <div className="ff"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
          <div className="ff"><label>Reason</label><input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="credit / transfer pending" /></div>
        </div>
        <div style={{ marginTop: 12 }}><button className="btn bf" disabled={busy} onClick={add}>{busy ? 'Adding…' : '+ Add suspense'}</button></div>
      </div>

      <div className="card no-print">
        <div className="ch"><h3>Suspense entries</h3><small style={{ color: 'var(--t2)' }}>{fs.length} entries</small></div>
        <RangePicker range={range} onChange={setRange} />
        <div className="krow" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="kc p"><div className="kl">Total suspense (range)</div><div className="kv">{R(total)}</div><div className="ks">not in hand</div></div>
        </div>
      </div>

      <div className="card">
        {fs.length === 0 ? <div className="notice" style={{ padding: 24 }}>No suspense in this range.</div> : (
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>Date</th><th className="n">Amount</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {fs.map((s) => (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.suspense_date}</td>
                    <td className="n" style={{ fontWeight: 700, color: 'var(--pur)' }}>{R(s.amount)}</td>
                    <td>{s.reason || '—'}</td>
                    <td><button className="btn br btn-xs" onClick={() => del(s)}>Delete</button></td>
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
