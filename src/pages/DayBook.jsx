import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { R } from '../lib/helpers'
import { buildLedger } from '../lib/reports'
import FilterBar from '../components/FilterBar'

export default function DayBook() {
  const { reports, expenses, purchases, deposits, withdrawals, config, filter } = useData()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']
  const cashName = accounts[0]
  const banks = accounts.filter((a) => a !== cashName)

  const ledger = useMemo(
    () => buildLedger(config, { reports, expenses, purchases, deposits, withdrawals }),
    [config, reports, expenses, purchases, deposits, withdrawals]
  )
  const current = ledger.balances
  const rows = ledger.rows.filter((b) => b.date >= filter.from && b.date <= filter.to).reverse()
  const periodSales = rows.reduce((a, r) => a + r.sales, 0)
  const periodOut = rows.reduce((a, r) => a + r.out, 0)
  // availability check: any account that went negative on any day
  const negatives = ledger.rows.flatMap((r) => accounts.filter((a) => r.balances[a] < 0).map((a) => ({ date: r.date, account: a, bal: r.balances[a] })))

  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — Day Book</h2><div>{filter.label} · {filter.from} to {filter.to}</div></div>

      <div className="card no-print">
        <div className="ch"><h3>🧾 Day Book</h3><button className="btn bo btn-sm" onClick={() => window.print()}>📄 Print</button></div>
        <div className="info-box">Cash: <strong>opening + cash sales − (expenses + purchases + deposits + withdrawals paid in cash) = closing</strong>. Bank accounts move via direct (UPI) sales, deposits in, and any spend paid from them. Closing balances for every account are shown below.</div>
        <FilterBar />
      </div>

      {negatives.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>⚠️ Balance went negative</div>
          {negatives.slice(0, 6).map((n, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--t1)' }}>• {n.account} on {n.date}: {R(n.bal)} — a payment/withdrawal exceeded the available balance.</div>)}
        </div>
      )}

      {/* current balances per account */}
      <div className="krow">
        {accounts.map((a) => (
          <div className={'kc ' + (current[a] >= 0 ? (a === cashName ? 'g' : 'b') : 'r')} key={a}>
            <div className="kl">{a === cashName ? '💵 ' : '🏦 '}{a}{a === cashName ? ' (cash in hand)' : ''}</div>
            <div className="kv">{R(current[a])}</div>
            <div className="ks">{current[a] < 0 ? 'over-drawn' : 'available now'}</div>
          </div>
        ))}
        <div className="kc p"><div className="kl">Total balance</div><div className="kv">{R(accounts.reduce((s, a) => s + current[a], 0))}</div><div className="ks">all accounts</div></div>
      </div>

      <div className="krow">
        <div className="kc b"><div className="kl">Cash sales (period)</div><div className="kv">{R(periodSales)}</div><div className="ks">{rows.length} day(s)</div></div>
        <div className="kc r"><div className="kl">Cash out (period)</div><div className="kv">{R(periodOut)}</div><div className="ks">exp + pur + deposit + draw</div></div>
      </div>

      <div className="card">
        <div className="ch"><h3>Daily cash flow</h3></div>
        {rows.length === 0 ? <div className="notice" style={{ padding: 24 }}>No activity in this range.</div> : (
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>Date</th><th className="n">Opening</th><th className="n">+ Cash sales</th><th className="n">− Expense</th><th className="n">− Purchase</th><th className="n">− Deposit</th><th className="n">− Draw</th><th className="n">= Closing</th><th>Day</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td className="n" style={{ color: 'var(--t2)' }}>{R(r.opening)}</td>
                    <td className="n" style={{ color: 'var(--grn)' }}>{r.sales ? R(r.sales) : '—'}</td>
                    <td className="n" style={{ color: r.exp ? 'var(--red)' : 'var(--t2)' }}>{r.exp ? R(r.exp) : '—'}</td>
                    <td className="n" style={{ color: r.pur ? 'var(--red)' : 'var(--t2)' }}>{r.pur ? R(r.pur) : '—'}</td>
                    <td className="n" style={{ color: r.dep ? 'var(--amb)' : 'var(--t2)' }}>{r.dep ? R(r.dep) : '—'}</td>
                    <td className="n" style={{ color: r.wd ? 'var(--pur)' : 'var(--t2)' }}>{r.wd ? R(r.wd) : '—'}</td>
                    <td className="n" style={{ fontWeight: 800, color: r.closing >= 0 ? 'var(--blu)' : 'var(--red)' }}>{R(r.closing)}</td>
                    <td>{r.hasReport ? <span className="badge bg-b">✓</span> : <span className="badge ba-b">adj</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {banks.length > 0 && (
        <div className="card">
          <div className="ch"><h3>🏦 Account closing balances</h3><small style={{ color: 'var(--t2)' }}>bank availability per day</small></div>
          {rows.length === 0 ? <div className="notice">No activity in this range.</div> : (
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Date</th>{accounts.map((a) => <th key={a} className="n">{a}</th>)}</tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.date}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.date}</td>
                      {accounts.map((a) => <td key={a} className="n" style={{ fontWeight: a === cashName ? 700 : 500, color: r.balances[a] < 0 ? 'var(--red)' : a === cashName ? 'var(--grn)' : 'var(--blu)' }}>{R(r.balances[a])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
