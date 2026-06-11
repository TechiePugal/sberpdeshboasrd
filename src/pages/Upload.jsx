import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R } from '../lib/helpers'
import { parseDailyUpload } from '../lib/pdfParse'

export default function Upload({ onNav }) {
  const { uid, reports, config, refresh } = useData()
  const { toast } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']

  const [stockFile, setStockFile] = useState(null)
  const [salesFile, setSalesFile] = useState(null)
  const [busy, setBusy] = useState('')
  const [draft, setDraft] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [coll, setColl] = useState({})

  const existing = draft ? reports.find((r) => r.entry_date === draft.entry_date) : null

  async function extract() {
    if (!stockFile && !salesFile) return toast('Attach at least the stock report PDF', true)
    setBusy('extract')
    try {
      const res = await parseDailyUpload(stockFile, salesFile)
      if (!res.ok) { toast(res.error || 'Could not read the PDF', true); setBusy(''); return }
      setDraft(res.record)
      setWarnings(res.warnings || [])
      const ex = reports.find((r) => r.entry_date === res.record.entry_date)
      // seed collections: existing values, else put full sales into Cash as a starting point
      const seed = {}
      accounts.forEach((a) => { seed[a] = ex?.day_end?.collections?.[a] ?? '' })
      if (!ex && accounts[0]) seed[accounts[0]] = res.record.total_sales
      setColl(seed)
      toast('✓ Extracted — review and split the collection below')
    } catch (e) {
      toast('Extract failed: ' + e.message, true)
    }
    setBusy('')
  }

  const setNum = (k, v) => setDraft((d) => {
    const next = { ...d, [k]: parseFloat(v) || 0 }
    next.gross_profit = (next.total_sales || 0) - (next.cogs || 0)
    return next
  })

  const collectedTotal = accounts.reduce((a, acct) => a + (parseFloat(coll[acct]) || 0), 0)
  const diff = draft ? draft.total_sales - collectedTotal : 0

  async function save() {
    setBusy('save')
    try {
      const collections = {}
      accounts.forEach((a) => { collections[a] = parseFloat(coll[a]) || 0 })
      const { item_coverage, ...rec } = draft
      await api.saveDailyReport(uid, draft.entry_date, {
        ...rec, item_coverage,
        day_end: { collections, collected_total: collectedTotal },
      })
      toast('✓ Saved report for ' + draft.entry_date)
      setDraft(null); setStockFile(null); setSalesFile(null); setWarnings([]); setColl({})
      await refresh()
      onNav('dash')
    } catch (e) {
      toast('Save failed: ' + e.message, true)
    }
    setBusy('')
  }

  const topItems = draft ? [...draft.items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 6) : []

  return (
    <>
      <div className="card">
        <div className="ch"><h3>Upload daily reports</h3><small style={{ color: 'var(--t2)' }}>PDF in, numbers out — nothing typed by hand</small></div>
        <div className="info-box">Attach the day's <strong>Closing Stock</strong> report (carries the official sales, cost and profit figures) and, optionally, the <strong>Sales/Billing</strong> report. The date and values are read automatically. The PDF is <strong>not stored</strong> — only the extracted figures are saved.</div>

        <div className="fg2">
          <FileDrop label="📦 Closing Stock report (PDF)" file={stockFile} onPick={setStockFile} required />
          <FileDrop label="🧾 Sales / Billing report (PDF)" file={salesFile} onPick={setSalesFile} />
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button className="btn bf" disabled={busy === 'extract'} onClick={extract}>
            {busy === 'extract' ? 'Reading PDF…' : '⚡ Extract data'}
          </button>
          {draft && <button className="btn bo" onClick={() => { setDraft(null); setWarnings([]) }}>Clear</button>}
        </div>
      </div>

      {draft && (
        <>
          {warnings.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--amb)' }}>
              <div style={{ fontWeight: 700, color: 'var(--amb)', marginBottom: 6 }}>⚠️ Please check</div>
              {warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--t1)', marginBottom: 3 }}>• {w}</div>)}
            </div>
          )}

          <div className="card">
            <div className="ch">
              <h3>Review — {draft.entry_date}</h3>
              {existing && <span className="badge ba-b">Updates existing record</span>}
            </div>

            <div className="krow">
              <div className="kc g"><div className="kl">Total Sales</div><div className="kv">{R(draft.total_sales)}</div><div className="ks">{draft.total_qty_sold} units</div></div>
              <div className="kc a"><div className="kl">COGS</div><div className="kv">{R(draft.cogs)}</div><div className="ks">cost of goods</div></div>
              <div className="kc b"><div className="kl">Gross Profit</div><div className="kv">{R(draft.gross_profit)}</div><div className="ks">{draft.total_sales ? ((draft.gross_profit / draft.total_sales) * 100).toFixed(1) : 0}% margin</div></div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '8px 0 6px' }}>Editable figures (fix any misread value)</div>
            <div className="fg3">
              <div className="ff"><label>Total Sales (₹)</label><input type="number" value={draft.total_sales} onChange={(e) => setNum('total_sales', e.target.value)} /></div>
              <div className="ff"><label>COGS (₹)</label><input type="number" value={draft.cogs} onChange={(e) => setNum('cogs', e.target.value)} /></div>
              <div className="ff"><label>Units sold</label><input type="number" value={draft.total_qty_sold} onChange={(e) => setNum('total_qty_sold', e.target.value)} /></div>
              <div className="ff"><label>Opening stock (cost)</label><input type="number" value={draft.opening_stock_cost} onChange={(e) => setNum('opening_stock_cost', e.target.value)} /></div>
              <div className="ff"><label>Closing stock (cost)</label><input type="number" value={draft.closing_stock_cost} onChange={(e) => setNum('closing_stock_cost', e.target.value)} /></div>
              <div className="ff"><label>Purchases (cost)</label><input type="number" value={draft.purchase_cost} onChange={(e) => setNum('purchase_cost', e.target.value)} /></div>
            </div>
          </div>

          <div className="card">
            <div className="ch"><h3>💵 Day-end collection (Cash & Bank)</h3><small style={{ color: 'var(--t2)' }}>how today's sales came in</small></div>
            <div className="fg3">
              {accounts.map((acct) => (
                <div className="ff" key={acct}><label>{acct} (₹)</label>
                  <input type="number" value={coll[acct] ?? ''} onChange={(e) => setColl((c) => ({ ...c, [acct]: e.target.value }))} placeholder="0" /></div>
              ))}
            </div>
            <div className="krow" style={{ marginTop: 8 }}>
              <div className="kc b"><div className="kl">Collected</div><div className="kv">{R(collectedTotal)}</div></div>
              <div className="kc g"><div className="kl">Total Sales</div><div className="kv">{R(draft.total_sales)}</div></div>
              <div className={'kc ' + (Math.abs(diff) < 1 ? 'g' : 'r')}><div className="kl">{diff > 0 ? 'Short / not collected' : diff < 0 ? 'Over collected' : 'Reconciled'}</div><div className="kv">{R(Math.abs(diff))}</div><div className="ks">{Math.abs(diff) < 1 ? '✓ matches sales' : 'sales − collected'}</div></div>
            </div>
            {diff > 0 && <div className="info-box" style={{ marginTop: 8 }}>Tip: the un-collected {R(diff)} is usually credit / UPI pending — add it in the <strong>Suspense</strong> menu so cash-in-hand stays correct.</div>}
          </div>

          {topItems.length > 0 && (
            <div className="card">
              <div className="ch"><h3>Top items in this report</h3><small style={{ color: 'var(--t2)' }}>item analytics cover ~{draft.item_coverage}% of sales</small></div>
              {topItems.map((it) => (
                <div className="dr" key={it.name}>
                  <span className="dl">{it.name} <span style={{ color: 'var(--t2)', fontSize: 11 }}>· {it.cat} · {it.margin}% margin</span></span>
                  <span className="dv g">{R(it.amount)} <span style={{ color: 'var(--t2)', fontWeight: 400 }}>({it.qty})</span></span>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ position: 'sticky', bottom: 0 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn bo" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn bf" disabled={busy === 'save'} onClick={save}>
                {busy === 'save' ? 'Saving…' : `💾 Save report for ${draft.entry_date}`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function FileDrop({ label, file, onPick, required }) {
  return (
    <div className="ff">
      <label>{label}{required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1.5px dashed var(--bd)', borderRadius: 'var(--rs)', cursor: 'pointer', background: file ? 'var(--grn-soft)' : 'var(--surface-2)' }}>
        <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => onPick(e.target.files[0] || null)} />
        <span style={{ fontSize: 20 }}>{file ? '✅' : '📄'}</span>
        <span style={{ fontSize: 12.5, color: file ? 'var(--grn)' : 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file ? file.name : 'Tap to choose a PDF'}</span>
      </label>
    </div>
  )
}
