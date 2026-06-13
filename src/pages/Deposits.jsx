import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange, todayStr } from '../lib/helpers'
import { computeBalances } from '../lib/reports'
import FilterBar from '../components/FilterBar'

export default function Deposits() {
  const { uid, deposits, reports, purchases, expenses, withdrawals, config, filter, refresh } = useData()
  const { toast, confirm } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']
  const cashName = accounts[0]
  const banks = accounts.filter((a) => a !== cashName) // deposit destinations

  const [form, setForm] = useState({ deposit_date: todayStr(), amount: '', to_account: banks[0] || '', note: '' })
  const [busy, setBusy] = useState(false)

  const balances = useMemo(() => computeBalances(config, { reports, purchases, expenses, deposits, withdrawals }, filter), [config, reports, purchases, expenses, deposits, withdrawals, filter])
  const bankBalances = balances.filter((b) => !b.isCash)
  const fd = filterRange(deposits, 'deposit_date', filter).slice().reverse()
  const total = fd.reduce((a, d) => a + (Number(d.amount) || 0), 0)

  async function add() {
    if (!banks.length) return toast('Add a bank account in Settings first', true)
    if (!(parseFloat(form.amount) > 0)) return toast('Enter an amount', true)
    setBusy(true)
    try {
      await api.addDeposit(uid, { deposit_date: form.deposit_date, amount: parseFloat(form.amount), to_account: form.to_account, note: form.note || '', created_at: Date.now() })
      toast('✓ Deposited to ' + form.to_account)
      setForm((f) => ({ ...f, amount: '', note: '' }))
      await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
    setBusy(false)
  }
  function del(d) {
    confirm('Delete deposit?', `${R(d.amount)} to ${d.to_account} on ${d.deposit_date}?`, async () => {
      try { await api.deleteDeposit(uid, d.id); toast('Deleted'); await refresh() }
      catch (e) { toast('Error: ' + e.message, true) }
    })
  }

  return (
    <>
      <div className="card">
        <div className="ch"><h3>🏦 Bank deposit</h3><small style={{ color: 'var(--t2)' }}>move cash into a bank account</small></div>
        <div className="info-box">A deposit takes money <strong>out of cash</strong> and adds it to the selected bank account. The bank's available balance grows; purchases/expenses paid from that bank reduce it.</div>
        {banks.length === 0 ? (
          <div className="notice">Add a bank account (e.g. GPay, Paytm) in <strong>Settings</strong> to record deposits.</div>
        ) : (
          <>
            <div className="fg3">
              <div className="ff"><label>Date</label><input type="date" value={form.deposit_date} onChange={(e) => setForm((f) => ({ ...f, deposit_date: e.target.value }))} /></div>
              <div className="ff"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
              <div className="ff"><label>Deposit to</label><select value={form.to_account} onChange={(e) => setForm((f) => ({ ...f, to_account: e.target.value }))}>{banks.map((a) => <option key={a}>{a}</option>)}</select></div>
              <div className="ff" style={{ gridColumn: 'span 3' }}><label>Note (optional)</label><input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            </div>
            <div style={{ marginTop: 12 }}><button className="btn bf" disabled={busy} onClick={add}>{busy ? 'Adding…' : '+ Add deposit'}</button></div>
          </>
        )}
      </div>

      <div className="card"><div className="ch"><h3>Bank balances</h3><small style={{ color: 'var(--t2)' }}>as of {filter.to}</small></div>
        {bankBalances.length ? (
          <div className="krow">{bankBalances.map((b) => <div className="kc b" key={b.account}><div className="kl">{b.account}</div><div className="kv">{R(b.balance)}</div><div className="ks">in {R(b.periodIn)} · out {R(b.periodOut)}</div></div>)}</div>
        ) : <div className="notice">No bank accounts yet.</div>}
      </div>

      <div className="card no-print"><div className="ch"><h3>Deposit history</h3><small style={{ color: 'var(--t2)' }}>{fd.length} · {R(total)}</small></div><FilterBar /></div>

      <div className="card">
        {fd.length === 0 ? <div className="notice" style={{ padding: 24 }}>No deposits in this range.</div> : (
          <div className="tw"><table className="tbl">
            <thead><tr><th>Date</th><th className="n">Amount</th><th>To account</th><th>Note</th><th></th></tr></thead>
            <tbody>{fd.map((d) => (
              <tr key={d.id}><td style={{ whiteSpace: 'nowrap' }}>{d.deposit_date}</td><td className="n" style={{ fontWeight: 700, color: 'var(--amb)' }}>{R(d.amount)}</td><td><span className="badge bb">{d.to_account}</span></td><td style={{ color: 'var(--t2)', fontSize: 12 }}>{d.note || '—'}</td><td><button className="btn br btn-xs" onClick={() => del(d)}>Del</button></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
