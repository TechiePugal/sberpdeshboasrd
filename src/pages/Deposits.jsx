import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange, todayStr } from '../lib/helpers'
import { computeBalances } from '../lib/reports'
import FilterBar from '../components/FilterBar'

export default function Deposits() {
  const { uid, deposits, reports, purchases, expenses, withdrawals, additions, leasecollections, config, filter, refresh } = useData()
  const { toast, confirm } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']
  const cashName = accounts[0]

  const [form, setForm] = useState({ deposit_date: todayStr(), amount: '', from_account: cashName, to_account: accounts.find((a) => a !== cashName) || '', note: '' })
  const [busy, setBusy] = useState(false)

  const balances = useMemo(
    () => computeBalances(config, { reports, purchases, expenses, deposits, withdrawals, additions, leasecollections }, filter),
    [config, reports, purchases, expenses, deposits, withdrawals, additions, leasecollections, filter]
  )
  const balOf = (a) => balances.find((b) => b.account === a)?.balance || 0
  const fd = filterRange(deposits, 'deposit_date', filter).slice().reverse()
  const total = fd.reduce((a, d) => a + (Number(d.amount) || 0), 0)

  const amt = parseFloat(form.amount) || 0
  const sameAcct = form.from_account === form.to_account

  async function add() {
    if (accounts.length < 2) return toast('Add another account in Settings first', true)
    if (amt <= 0) return toast('Enter an amount', true)
    if (sameAcct) return toast('From and To must be different accounts', true)
    if (amt > balOf(form.from_account)) return toast(`Only ${R(balOf(form.from_account))} available in ${form.from_account}`, true)
    setBusy(true)
    try {
      await api.addDeposit(uid, {
        deposit_date: form.deposit_date, amount: amt,
        from_account: form.from_account, to_account: form.to_account,
        note: form.note || '', created_at: Date.now(),
      })
      toast(`✓ Moved ${R(amt)} · ${form.from_account} → ${form.to_account}`)
      setForm((f) => ({ ...f, amount: '', note: '' }))
      await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
    setBusy(false)
  }
  function del(d) {
    confirm('Delete transfer?', `${R(d.amount)} ${d.from_account || cashName} → ${d.to_account} on ${d.deposit_date}?`, async () => {
      try { await api.deleteDeposit(uid, d.id); toast('Deleted'); await refresh() }
      catch (e) { toast('Error: ' + e.message, true) }
    })
  }

  return (
    <>
      <div className="card">
        <div className="ch"><h3>🏦 Transfer / deposit</h3><small style={{ color: 'var(--t2)' }}>move money between accounts</small></div>
        <div className="info-box">Move money from one account to another — cash into a bank, or bank to bank. The <strong>From</strong> account is reduced and the <strong>To</strong> account is increased.</div>
        {accounts.length < 2 ? (
          <div className="notice">Add another account (e.g. GPay, Paytm, Bank) in <strong>Settings</strong> to transfer between accounts.</div>
        ) : (
          <>
            <div className="fg3">
              <div className="ff"><label>Date</label><input type="date" value={form.deposit_date} onChange={(e) => setForm((f) => ({ ...f, deposit_date: e.target.value }))} /></div>
              <div className="ff"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
              <div className="ff"><label>From account</label><select value={form.from_account} onChange={(e) => setForm((f) => ({ ...f, from_account: e.target.value }))}>{accounts.map((a) => <option key={a}>{a}</option>)}</select></div>
              <div className="ff"><label>To account</label><select value={form.to_account} onChange={(e) => setForm((f) => ({ ...f, to_account: e.target.value }))}>{accounts.filter((a) => a !== form.from_account).map((a) => <option key={a}>{a}</option>)}</select></div>
              <div className="ff" style={{ gridColumn: 'span 2' }}><label>Note (optional)</label><input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            </div>
            <div style={{ marginTop: 6, marginBottom: 10, fontSize: 12.5, color: 'var(--t2)' }}>
              Available in <strong>{form.from_account}</strong>: {R(balOf(form.from_account))}
              {amt > 0 && !sameAcct && <> · after transfer → {form.from_account}: <strong>{R(balOf(form.from_account) - amt)}</strong>, {form.to_account}: <strong>{R(balOf(form.to_account) + amt)}</strong></>}
            </div>
            <button className="btn bf" disabled={busy} onClick={add}>{busy ? 'Moving…' : '+ Transfer money'}</button>
          </>
        )}
      </div>

      <div className="card"><div className="ch"><h3>Account balances</h3><small style={{ color: 'var(--t2)' }}>as of {filter.to}</small></div>
        <div className="krow">{balances.map((b) => <div className={'kc ' + (b.isCash ? 'g' : 'b')} key={b.account}><div className="kl">{b.isCash ? '💵 ' : '🏦 '}{b.account}</div><div className="kv">{R(b.balance)}</div><div className="ks">in {R(b.periodIn)} · out {R(b.periodOut)}</div></div>)}</div>
      </div>

      <div className="card no-print"><div className="ch"><h3>Transfer history</h3><small style={{ color: 'var(--t2)' }}>{fd.length} · {R(total)}</small></div><FilterBar /></div>

      <div className="card">
        {fd.length === 0 ? <div className="notice" style={{ padding: 24 }}>No transfers in this range.</div> : (
          <div className="tw"><table className="tbl">
            <thead><tr><th>Date</th><th className="n">Amount</th><th>From</th><th>To</th><th>Note</th><th></th></tr></thead>
            <tbody>{fd.map((d) => (
              <tr key={d.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{d.deposit_date}</td>
                <td className="n" style={{ fontWeight: 700, color: 'var(--amb)' }}>{R(d.amount)}</td>
                <td><span className="badge br-b">{d.from_account || cashName}</span></td>
                <td><span className="badge bb">{d.to_account}</span></td>
                <td style={{ color: 'var(--t2)', fontSize: 12 }}>{d.note || '—'}</td>
                <td><button className="btn br btn-xs" onClick={() => del(d)}>Del</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
