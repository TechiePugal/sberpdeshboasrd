import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange, todayStr } from '../lib/helpers'
import { computeBalances } from '../lib/reports'
import FilterBar from '../components/FilterBar'

export default function ProfitSplit() {
  const { uid, withdrawals, reports, purchases, expenses, deposits, config, filter, refresh } = useData()
  const { toast, confirm } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']

  const [form, setForm] = useState({ withdraw_date: todayStr(), amount: '', from_account: accounts[0], note: '' })
  const [busy, setBusy] = useState(false)

  const balances = useMemo(() => computeBalances(config, { reports, purchases, expenses, deposits, withdrawals }, filter), [config, reports, purchases, expenses, deposits, withdrawals, filter])
  const balOf = (a) => balances.find((b) => b.account === a)?.balance || 0
  const fw = filterRange(withdrawals, 'withdraw_date', filter).slice().reverse()
  const total = fw.reduce((a, w) => a + (Number(w.amount) || 0), 0)

  async function add() {
    const amt = parseFloat(form.amount) || 0
    if (amt <= 0) return toast('Enter an amount', true)
    if (amt > balOf(form.from_account)) {
      return toast(`Only ${R(balOf(form.from_account))} available in ${form.from_account}`, true)
    }
    setBusy(true)
    try {
      await api.addWithdrawal(uid, { withdraw_date: form.withdraw_date, amount: amt, from_account: form.from_account, note: form.note || '', created_at: Date.now() })
      toast('✓ Withdrawn from ' + form.from_account)
      setForm((f) => ({ ...f, amount: '', note: '' }))
      await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
    setBusy(false)
  }
  function del(w) {
    confirm('Delete withdrawal?', `${R(w.amount)} from ${w.from_account} on ${w.withdraw_date}?`, async () => {
      try { await api.deleteWithdrawal(uid, w.id); toast('Deleted'); await refresh() }
      catch (e) { toast('Error: ' + e.message, true) }
    })
  }

  return (
    <>
      <div className="card">
        <div className="ch"><h3>💸 Profit split / withdrawal</h3><small style={{ color: 'var(--t2)' }}>take money out at month-end</small></div>
        <div className="info-box">Record money taken out (profit distribution). It <strong>reduces the selected account's balance</strong> but is not counted as a business expense, so it does not change your profit figures.</div>
        <div className="fg3">
          <div className="ff"><label>Date</label><input type="date" value={form.withdraw_date} onChange={(e) => setForm((f) => ({ ...f, withdraw_date: e.target.value }))} /></div>
          <div className="ff"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
          <div className="ff"><label>Withdraw from</label><select value={form.from_account} onChange={(e) => setForm((f) => ({ ...f, from_account: e.target.value }))}>{accounts.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="ff" style={{ gridColumn: 'span 2' }}><label>Note / who took it</label><input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Partner 1 share" /></div>
        </div>
        <div style={{ marginTop: 6, marginBottom: 8, fontSize: 12.5, color: 'var(--t2)' }}>Available in <strong>{form.from_account}</strong>: {R(balOf(form.from_account))}</div>
        <button className="btn bf" disabled={busy} onClick={add}>{busy ? 'Adding…' : '+ Record withdrawal'}</button>
      </div>

      <div className="card"><div className="ch"><h3>Available to withdraw</h3><small style={{ color: 'var(--t2)' }}>as of {filter.to}</small></div>
        <div className="krow">{balances.map((b) => <div className={'kc ' + (b.balance >= 0 ? 'g' : 'r')} key={b.account}><div className="kl">{b.account}</div><div className="kv">{R(b.balance)}</div></div>)}</div>
      </div>

      <div className="card no-print"><div className="ch"><h3>Withdrawal history</h3><small style={{ color: 'var(--t2)' }}>{fw.length} · {R(total)}</small></div><FilterBar /></div>

      <div className="card">
        {fw.length === 0 ? <div className="notice" style={{ padding: 24 }}>No withdrawals in this range.</div> : (
          <div className="tw"><table className="tbl">
            <thead><tr><th>Date</th><th className="n">Amount</th><th>From</th><th>Note</th><th></th></tr></thead>
            <tbody>{fw.map((w) => (
              <tr key={w.id}><td style={{ whiteSpace: 'nowrap' }}>{w.withdraw_date}</td><td className="n" style={{ fontWeight: 700, color: 'var(--pur)' }}>{R(w.amount)}</td><td><span className="badge bp-b">{w.from_account}</span></td><td style={{ color: 'var(--t2)', fontSize: 12 }}>{w.note || '—'}</td><td><button className="btn br btn-xs" onClick={() => del(w)}>Del</button></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
