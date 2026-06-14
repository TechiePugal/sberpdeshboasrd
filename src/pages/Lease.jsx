import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, todayStr } from '../lib/helpers'
import { leaseDailyTotal, leasedModuleLabels } from '../lib/reports'
import Modal from '../components/Modal'

const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}
const addMonths = (ym, n) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Lease() {
  const { uid, reports, leasecollections, config, refresh } = useData()
  const { toast, confirm } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']
  const leaseDay = leaseDailyTotal(config)
  const leasedLabels = leasedModuleLabels(config)

  const [collect, setCollect] = useState(null) // {month, due}
  const [form, setForm] = useState({ amount: '', to_account: accounts[0], collect_date: todayStr() })

  const months = useMemo(() => {
    const set = new Set()
    reports.forEach((r) => set.add(r.entry_date.slice(0, 7)))
    leasecollections.forEach((l) => set.add(l.month || (l.collect_date || '').slice(0, 7)))
    const cur = todayStr().slice(0, 7)
    set.add(cur)
    for (let i = 1; i <= 3; i++) set.add(addMonths(cur, i)) // future months
    return [...set].filter(Boolean).sort().reverse()
  }, [reports, leasecollections])

  const rowFor = (ym) => {
    const workDays = reports.filter((r) => r.entry_date.slice(0, 7) === ym).length
    const due = leaseDay * workDays
    const collected = leasecollections.filter((l) => (l.month || (l.collect_date || '').slice(0, 7)) === ym).reduce((a, l) => a + (Number(l.amount) || 0), 0)
    const future = ym > todayStr().slice(0, 7)
    return { ym, workDays, due, collected, balance: due - collected, future }
  }
  const rows = months.map(rowFor)
  const totDue = rows.reduce((a, r) => a + r.due, 0)
  const totCollected = rows.reduce((a, r) => a + r.collected, 0)

  function openCollect(r) {
    setCollect(r)
    setForm({ amount: r.balance > 0 ? r.balance : '', to_account: accounts[0], collect_date: todayStr() })
  }
  async function save() {
    const amt = parseFloat(form.amount) || 0
    if (amt <= 0) return toast('Enter an amount', true)
    try {
      await api.addLeaseCollection(uid, { collect_date: form.collect_date, month: collect.ym, amount: amt, to_account: form.to_account, note: `Lease ${monthName(collect.ym)}`, created_at: Date.now() })
      toast('✓ Lease collected to ' + form.to_account)
      setCollect(null); await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
  }
  function delColl(l) {
    confirm('Delete collection?', `${R(l.amount)} on ${l.collect_date}?`, async () => {
      try { await api.deleteLeaseCollection(uid, l.id); toast('Deleted'); await refresh() }
      catch (e) { toast('Error: ' + e.message, true) }
    })
  }

  if (!config.lease_mode || leaseDay <= 0) {
    return <div className="card" style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 40 }}>🔑</div>
      <h3 style={{ margin: '10px 0 6px' }}>Lease Mode is off</h3>
      <p style={{ color: 'var(--t2)', fontSize: 13 }}>Turn on Lease Mode and set the daily lease amount in Settings to manage lease here.</p>
    </div>
  }

  const history = [...leasecollections].sort((a, b) => (b.collect_date || '').localeCompare(a.collect_date || ''))

  return (
    <>
      <div className="card no-print">
        <div className="ch"><h3>🔑 Lease management</h3></div>
        <div className="info-box">Leased: <strong>{leasedLabels.join(', ')}</strong> at <strong>{R(leaseDay)}/day</strong>. Lease accrues for each <strong>working day</strong> (a day a report was uploaded). When you collect, the amount is added to the payment method you choose.</div>
        <div className="krow" style={{ marginBottom: 0 }}>
          <div className="kc p"><div className="kl">Per-day lease</div><div className="kv">{R(leaseDay)}</div></div>
          <div className="kc a"><div className="kl">Accrued (all months)</div><div className="kv">{R(totDue)}</div></div>
          <div className="kc g"><div className="kl">Collected</div><div className="kv">{R(totCollected)}</div></div>
          <div className="kc b"><div className="kl">Outstanding</div><div className="kv">{R(totDue - totCollected)}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><h3>Month-wise</h3></div>
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>Month</th><th className="n">Working days</th><th className="n">Lease due</th><th className="n">Collected</th><th className="n">Balance</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ym} style={{ opacity: r.future && r.workDays === 0 ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{monthName(r.ym)} {r.future && <span className="badge ba-b">future</span>}</td>
                  <td className="n">{r.workDays}</td>
                  <td className="n" style={{ color: 'var(--pur)', fontWeight: 700 }}>{R(r.due)}</td>
                  <td className="n" style={{ color: 'var(--grn)' }}>{R(r.collected)}</td>
                  <td className="n" style={{ color: r.balance > 0 ? 'var(--amb)' : 'var(--t2)', fontWeight: 700 }}>{R(r.balance)}</td>
                  <td><button className="btn bf btn-xs" onClick={() => openCollect(r)}>Collect</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <div className="ch"><h3>Collection history</h3></div>
          <div className="tw"><table className="tbl">
            <thead><tr><th>Date</th><th>For month</th><th className="n">Amount</th><th>To</th><th></th></tr></thead>
            <tbody>{history.map((l) => (
              <tr key={l.id}><td>{l.collect_date}</td><td>{l.month ? monthName(l.month) : '—'}</td><td className="n" style={{ fontWeight: 700, color: 'var(--grn)' }}>{R(l.amount)}</td><td><span className="badge bb">{l.to_account}</span></td><td><button className="btn br btn-xs" onClick={() => delColl(l)}>Del</button></td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      <Modal open={!!collect} onClose={() => setCollect(null)} title={collect ? `Collect lease — ${monthName(collect.ym)}` : ''} maxWidth={460}>
        {collect && (
          <>
            <div className="krow"><div className="kc p"><div className="kl">Due</div><div className="kv">{R(collect.due)}</div></div><div className="kc g"><div className="kl">Already collected</div><div className="kv">{R(collect.collected)}</div></div></div>
            <div className="fg2">
              <div className="ff"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
              <div className="ff"><label>Add to</label><select value={form.to_account} onChange={(e) => setForm((f) => ({ ...f, to_account: e.target.value }))}>{accounts.map((a) => <option key={a}>{a}</option>)}</select></div>
            </div>
            <div className="ff"><label>Date</label><input type="date" value={form.collect_date} onChange={(e) => setForm((f) => ({ ...f, collect_date: e.target.value }))} /></div>
            <div className="modal-actions"><button className="btn bo" onClick={() => setCollect(null)}>Cancel</button><button className="btn bf" onClick={save}>Collect</button></div>
          </>
        )}
      </Modal>
    </>
  )
}
