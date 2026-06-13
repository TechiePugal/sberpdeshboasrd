import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { R, MODULES } from '../lib/helpers'

export default function Settings() {
  const { config, updateConfig } = useData()
  const { toast } = useUI()
  const [cfg, setCfg] = useState(config)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setCfg(config) }, [config])

  const setAccountName = (i, name) => setCfg((c) => {
    const accounts = [...c.accounts]; const old = accounts[i]; accounts[i] = name
    const openings = { ...c.openings }; if (old in openings) { openings[name] = openings[old]; delete openings[old] }
    return { ...c, accounts, openings }
  })
  const setOpening = (acct, v) => setCfg((c) => ({ ...c, openings: { ...c.openings, [acct]: parseFloat(v) || 0 } }))
  const addAccount = () => setCfg((c) => ({ ...c, accounts: [...c.accounts, `Account ${c.accounts.length + 1}`] }))
  const removeAccount = (i) => setCfg((c) => {
    const accounts = c.accounts.filter((_, idx) => idx !== i)
    return { ...c, accounts }
  })

  const toggleLease = () => setCfg((c) => ({ ...c, lease_mode: !c.lease_mode }))
  const toggleSuspense = () => setCfg((c) => ({ ...c, reduce_suspense: !c.reduce_suspense }))
  const toggleModule = (id) => setCfg((c) => ({ ...c, leased: { ...c.leased, [id]: !c.leased?.[id] } }))
  const setLeaseAmt = (id, v) => setCfg((c) => ({ ...c, lease_amounts: { ...c.lease_amounts, [id]: parseFloat(v) || 0 } }))

  const leaseTotal = MODULES.reduce((a, m) => a + (cfg.lease_mode && cfg.leased?.[m.id] ? Number(cfg.lease_amounts?.[m.id]) || 0 : 0), 0)

  async function save() {
    setBusy(true)
    try { await updateConfig(cfg); toast('✓ Settings saved') }
    catch (e) { toast('Error: ' + e.message, true) }
    setBusy(false)
  }

  return (
    <>
      <div className="card">
        <div className="ch"><h3>💳 Payment accounts</h3><small style={{ color: 'var(--t2)' }}>cash & bank/UPI you collect into</small></div>
        <div className="info-box">These are the buckets used at day-end and for "paid from" on purchases/expenses. Set each one's <strong>opening balance</strong> so running balances are correct.</div>
        {cfg.accounts.map((acct, i) => (
          <div key={i} className="fg3" style={{ alignItems: 'end', marginBottom: 6 }}>
            <div className="ff"><label>Account name</label><input value={acct} onChange={(e) => setAccountName(i, e.target.value)} /></div>
            <div className="ff"><label>Opening balance (₹)</label><input type="number" value={cfg.openings?.[acct] ?? ''} onChange={(e) => setOpening(acct, e.target.value)} placeholder="0" /></div>
            <div className="ff"><label>&nbsp;</label>{cfg.accounts.length > 1 && <button className="btn bo" onClick={() => removeAccount(i)}>Remove</button>}</div>
          </div>
        ))}
        <button className="btn bo btn-sm" onClick={addAccount}>+ Add account</button>
      </div>

      <div className="card">
        <div className="ch"><h3>🔑 Lease Mode</h3>
          <button className={'btn btn-sm ' + (cfg.lease_mode ? 'bf' : 'bo')} onClick={toggleLease}>{cfg.lease_mode ? 'ON' : 'OFF'}</button>
        </div>
        <div className="info-box">Turn this on when you lease out part of the business. Pick which modules are leased and set the <strong>daily lease amount</strong> you receive for each. It is booked as income at <strong>lease × working days</strong>, where a working day = a day you uploaded a report. The lease total is added to profit (recognised month-end).</div>
        {cfg.lease_mode && (
          <>
            {MODULES.map((m) => (
              <div key={m.id} className="dr" style={{ alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                  <input type="checkbox" checked={!!cfg.leased?.[m.id]} onChange={() => toggleModule(m.id)} />
                  <span className="dl">{m.label}</span>
                </label>
                {cfg.leased?.[m.id] && (
                  <div className="ff" style={{ margin: 0, width: 160 }}>
                    <input type="number" value={cfg.lease_amounts?.[m.id] ?? ''} onChange={(e) => setLeaseAmt(m.id, e.target.value)} placeholder="₹ / day" />
                  </div>
                )}
              </div>
            ))}
            <div className="krow" style={{ marginTop: 10 }}>
              <div className="kc p"><div className="kl">Total daily lease</div><div className="kv">{R(leaseTotal)}</div><div className="ks">per day income</div></div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="ch"><h3>⏳ Suspense handling</h3>
          <button className={'btn btn-sm ' + (cfg.reduce_suspense ? 'bf' : 'bo')} onClick={toggleSuspense}>{cfg.reduce_suspense ? 'YES' : 'NO'}</button>
        </div>
        <div className="info-box">
          Default is <strong>NO</strong> — suspense is shown but <strong>not</strong> deducted from profit or cash (ignored in the dashboard).
          Switch to <strong>YES</strong> to <strong>reduce the suspense amount at month-end</strong>: it is then subtracted from net profit / cash-in-hand and listed in the monthly Profit &amp; Loss report.
        </div>
      </div>

      <div className="card" style={{ position: 'sticky', bottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn bf" disabled={busy} onClick={save}>{busy ? 'Saving…' : '💾 Save settings'}</button>
        </div>
      </div>
    </>
  )
}
