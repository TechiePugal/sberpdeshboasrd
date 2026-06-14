import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { R } from '../lib/helpers'
import { buildLedger } from '../lib/reports'
import FilterBar from '../components/FilterBar'

// ── Opening Balance Modal ────────────────────────────────────────────────────
// Called from inside an expanded row. `focusAccount` pre-selects the account
// that the user clicked into (defaults to the first account / cash).
function OpeningBalanceModal({ accounts, config, focusAccount, onSave, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(accounts.map((a) => [a, {
      amount: config.openings?.[a] ?? '',
      date: config.opening_dates?.[a] ?? '',
    }]))
  )
  const [busy, setBusy] = useState(false)

  const setAmt = (acct, v) =>
    setValues((prev) => ({ ...prev, [acct]: { ...prev[acct], amount: v } }))
  const setDate = (acct, v) =>
    setValues((prev) => ({ ...prev, [acct]: { ...prev[acct], date: v } }))

  async function handleSave() {
    setBusy(true)
    const openings = {}
    const opening_dates = {}
    accounts.forEach((a) => {
      openings[a] = parseFloat(values[a].amount) || 0
      opening_dates[a] = values[a].date || ''
    })
    await onSave({ openings, opening_dates })
    setBusy(false)
  }

  // Put the focused account first so it's immediately visible
  const sorted = focusAccount
    ? [focusAccount, ...accounts.filter((a) => a !== focusAccount)]
    : accounts

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">💰 Opening Balance</div>
        <div className="modal-sub">
          Set the starting cash / bank balance and the date it applies from.
          The Day Book will carry these amounts forward through every subsequent day.
        </div>

        {sorted.map((acct) => (
          <div key={acct} style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--rs)', border: acct === focusAccount ? '2px solid var(--blu)' : '1px solid var(--bor)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              {acct === accounts[0] ? '💵' : '🏦'} {acct}
              {acct === focusAccount && <span style={{ fontSize: 11, color: 'var(--blu)', fontWeight: 400, marginLeft: 4 }}>← selected row</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="ff">
                <label>Opening balance (₹)</label>
                <input
                  type="number"
                  value={values[acct].amount}
                  onChange={(e) => setAmt(acct, e.target.value)}
                  placeholder="0"
                  min="0"
                  autoFocus={acct === focusAccount}
                />
              </div>
              <div className="ff">
                <label>Effective from date</label>
                <input
                  type="date"
                  value={values[acct].date}
                  onChange={(e) => setDate(acct, e.target.value)}
                />
              </div>
            </div>
            {values[acct].amount && values[acct].date && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--blu)' }}>
                ✓ {acct} starts at {R(parseFloat(values[acct].amount) || 0)} from {values[acct].date}
              </div>
            )}
            {values[acct].amount && !values[acct].date && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amb)' }}>
                ⚠ Set a date for this opening balance to take effect
              </div>
            )}
          </div>
        ))}

        <div className="modal-actions">
          <button className="btn bo" onClick={onClose}>Cancel</button>
          <button className="btn bf" disabled={busy} onClick={handleSave}>
            {busy ? 'Saving…' : '💾 Save opening balances'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main DayBook ─────────────────────────────────────────────────────────────
export default function DayBook() {
  const { reports, expenses, purchases, deposits, withdrawals, config, filter, updateConfig } = useData()
  const { toast } = useUI()

  const accounts = config.accounts?.length ? config.accounts : ['Cash']
  const cashName = accounts[0]
  const banks = accounts.filter((a) => a !== cashName)

  const [expandedRow, setExpandedRow] = useState(null)
  // { open: true, focusAccount: 'Cash' }
  const [openingModal, setOpeningModal] = useState(null)

  const ledger = useMemo(
    () => buildLedger(config, { reports, expenses, purchases, deposits, withdrawals }),
    [config, reports, expenses, purchases, deposits, withdrawals]
  )
  const current = ledger.balances
  const rows = ledger.rows.filter((b) => b.date >= filter.from && b.date <= filter.to).reverse()
  const periodSales = rows.reduce((a, r) => a + r.sales, 0)
  const periodOut = rows.reduce((a, r) => a + r.out, 0)
  const negatives = ledger.rows.flatMap((r) => accounts.filter((a) => r.balances[a] < 0).map((a) => ({ date: r.date, account: a, bal: r.balances[a] })))

  // Which dates have an opening balance applied on them?
  const openingDates = new Set(
    accounts.map((a) => config.opening_dates?.[a]).filter(Boolean)
  )

  // Does any row in the current view have an "added" amount (OB or cash addition)?
  const hasAdded = rows.some((r) => r.added > 0)

  async function saveOpeningBalance({ openings, opening_dates }) {
    try {
      const next = { ...config, openings, opening_dates }
      await updateConfig(next)
      toast('✓ Opening balances saved')
      setOpeningModal(null)
    } catch (e) {
      toast('Error: ' + e.message, true)
    }
  }

  function toggleRow(date) {
    setExpandedRow((prev) => (prev === date ? null : date))
  }

  function openModalForRow(e, focusAccount) {
    e.stopPropagation()
    setOpeningModal({ open: true, focusAccount })
  }

  return (
    <>
      <div className="print-head"><h2>Siruvani Bar — Day Book</h2><div>{filter.label} · {filter.from} to {filter.to}</div></div>

      <div className="card no-print">
        <div className="ch"><h3>🧾 Day Book</h3><button className="btn bo btn-sm" onClick={() => window.print()}>📄 Print</button></div>
        <div className="info-box">
          Cash: <strong>opening + cash sales − (expenses + purchases + deposits + withdrawals paid in cash) = closing</strong>. Bank accounts move via direct (UPI) sales, deposits in, and any spend paid from them.
          <br />
          <span style={{ marginTop: 4, display: 'inline-block', color: 'var(--t2)', fontSize: 12 }}>
            💡 To set or edit an opening balance — click any row in the table below, then click <strong>💰 Edit Opening Balance</strong>.
          </span>
        </div>
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
        <div className="ch">
          <h3>Daily cash flow</h3>
          <small style={{ color: 'var(--t2)' }}>click a row to expand &amp; edit opening balance</small>
        </div>
        {rows.length === 0 ? (
          <div className="notice" style={{ padding: 24 }}>
            No activity in this range.{' '}
            <span>
              Click any row in the table to set an opening balance and initialise your accounts.
            </span>
          </div>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="n">Opening</th>
                  {hasAdded && <th className="n" title="Opening balance or cash addition credited on this date" style={{ color: 'var(--grn)' }}>+ OB / Added</th>}
                  <th className="n">+ Cash sales</th>
                  <th className="n">− Expense</th>
                  <th className="n">− Purchase</th>
                  <th className="n">− Deposit</th>
                  <th className="n">− Draw</th>
                  <th className="n">= Closing</th>
                  <th>Day</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpeningDay = openingDates.has(r.date)
                  return (
                    <>
                      <tr
                        key={r.date}
                        style={{
                          cursor: 'pointer',
                          background: expandedRow === r.date
                            ? 'var(--blu-soft)'
                            : isOpeningDay
                            ? 'rgba(var(--grn-rgb,40,167,69),0.06)'
                            : undefined,
                        }}
                        onClick={() => toggleRow(r.date)}
                      >
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <span style={{ marginRight: 5, fontSize: 11, color: 'var(--t2)' }}>{expandedRow === r.date ? '▾' : '▸'}</span>
                          {r.date}
                          {isOpeningDay && (
                            <span title="Opening balance takes effect on this date" style={{ marginLeft: 5, fontSize: 10, color: 'var(--grn)', fontWeight: 700, border: '1px solid var(--grn)', borderRadius: 3, padding: '0 3px' }}>OB</span>
                          )}
                        </td>
                        <td className="n" style={{ color: isOpeningDay ? 'var(--grn)' : 'var(--t2)', fontWeight: isOpeningDay ? 700 : 400 }}>
                          {R(r.opening)}
                          {isOpeningDay && <span title="Opening balance added on this date" style={{ marginLeft: 4, fontSize: 10 }}>★</span>}
                        </td>
                        {hasAdded && (
                          <td className="n" style={{ color: r.added ? 'var(--grn)' : 'var(--t2)', fontWeight: r.added ? 700 : 400 }}>
                            {r.added ? R(r.added) : '—'}
                            {r.added && openingDates.has(r.date) ? <span title="Opening balance" style={{ marginLeft: 3, fontSize: 10 }}>★</span> : null}
                          </td>
                        )}
                        <td className="n" style={{ color: 'var(--grn)' }}>{r.sales ? R(r.sales) : '—'}</td>
                        <td className="n" style={{ color: r.exp ? 'var(--red)' : 'var(--t2)' }}>{r.exp ? R(r.exp) : '—'}</td>
                        <td className="n" style={{ color: r.pur ? 'var(--red)' : 'var(--t2)' }}>{r.pur ? R(r.pur) : '—'}</td>
                        <td className="n" style={{ color: r.dep ? 'var(--amb)' : 'var(--t2)' }}>{r.dep ? R(r.dep) : '—'}</td>
                        <td className="n" style={{ color: r.wd ? 'var(--pur)' : 'var(--t2)' }}>{r.wd ? R(r.wd) : '—'}</td>
                        <td className="n" style={{ fontWeight: 800, color: r.closing >= 0 ? 'var(--blu)' : 'var(--red)' }}>{R(r.closing)}</td>
                        <td>{r.hasReport ? <span className="badge bg-b">✓</span> : <span className="badge ba-b">adj</span>}</td>
                      </tr>

                      {expandedRow === r.date && (
                        <tr key={r.date + '-exp'} style={{ background: 'var(--blu-soft)' }}>
                          <td colSpan={hasAdded ? 10 : 9} style={{ padding: '12px 16px' }}>
                            {/* Summary line */}
                            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 10 }}>
                              <strong>{r.date}</strong> — opening cash:{' '}
                              <strong style={{ color: 'var(--blu)' }}>{R(r.opening)}</strong>
                              {isOpeningDay && (
                                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--grn)', fontWeight: 600 }}>
                                  (opening balance active on this date)
                                </span>
                              )}
                              {', '}closing:{' '}
                              <strong style={{ color: r.closing >= 0 ? 'var(--grn)' : 'var(--red)' }}>{R(r.closing)}</strong>
                            </div>

                            {/* Per-account balances (multi-account) */}
                            {accounts.length > 1 && (
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                                {accounts.map((a) => (
                                  <div key={a} style={{ fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {a === cashName ? '💵' : '🏦'} <strong>{a}</strong>:{' '}
                                    <span style={{ color: r.balances[a] >= 0 ? 'var(--grn)' : 'var(--red)', fontWeight: 700 }}>{R(r.balances[a])}</span>
                                    {config.opening_dates?.[a] === r.date && (
                                      <span style={{ fontSize: 10, color: 'var(--grn)', marginLeft: 2 }}>★ OB</span>
                                    )}
                                    <button
                                      className="btn bo btn-xs"
                                      style={{ marginLeft: 4 }}
                                      onClick={(e) => openModalForRow(e, a)}
                                    >
                                      💰 {config.openings?.[a] ? 'Edit OB' : 'Set OB'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Single account — just one button */}
                            {accounts.length === 1 && (
                              <div>
                                <button
                                  className="btn bf btn-sm"
                                  onClick={(e) => openModalForRow(e, cashName)}
                                >
                                  💰 {config.openings?.[cashName] ? `Edit Opening Balance (currently ${R(config.openings[cashName])})` : 'Set Opening Balance'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
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

      {openingModal?.open && (
        <OpeningBalanceModal
          accounts={accounts}
          config={config}
          focusAccount={openingModal.focusAccount}
          onSave={saveOpeningBalance}
          onClose={() => setOpeningModal(null)}
        />
      )}
    </>
  )
}
