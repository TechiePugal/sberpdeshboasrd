import { useState, useMemo } from 'react'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange, todayStr } from '../lib/helpers'
import { defaultRange } from '../lib/ranges'
import RangePicker from '../components/RangePicker'
import Modal from '../components/Modal'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
const COLORS = ['#0071e3', '#1a9e4b', '#b25e00', '#d70015', '#8944ab', '#00a3a3', '#e8590c', '#c2255c', '#1098ad', '#5f3dc4']

export default function Expenses() {
  const { uid, expenses, categories, config, refresh, updateCategories } = useData()
  const { toast, confirm } = useUI()
  const accounts = config.accounts?.length ? config.accounts : ['Cash']

  const [range, setRange] = useState(defaultRange())
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState({ expense_date: todayStr(), category: '', amount: '', paid_from: accounts[0], notes: '' })
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState(null)

  const inRange = filterRange(expenses, 'expense_date', range)
  const cats = [...new Set(inRange.map((e) => e.category).filter(Boolean))].sort()
  const filtered = catFilter ? inRange.filter((e) => e.category === catFilter) : inRange
  const total = filtered.reduce((a, e) => a + (e.amount || 0), 0)

  const chartData = useMemo(() => {
    const map = {}
    inRange.forEach((e) => { map[e.category || 'Uncategorised'] = (map[e.category || 'Uncategorised'] || 0) + (e.amount || 0) })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    return { labels: sorted.map((x) => x[0]), values: sorted.map((x) => x[1]) }
  }, [inRange])

  async function add() {
    const cat = form.category.trim(), amt = parseFloat(form.amount) || 0
    if (!cat) return toast('Add a reason / category', true)
    if (!amt) return toast('Enter an amount', true)
    setBusy(true)
    try {
      if (!categories[cat]) await updateCategories({ ...categories, [cat]: categories[cat] || [] })
      await api.addExpense(uid, {
        expense_date: form.expense_date, category: cat, amount: amt,
        paid_from: form.paid_from, notes: form.notes || '', created_at: Date.now(),
      })
      toast('✓ Expense added')
      setForm((f) => ({ ...f, amount: '', notes: '' }))
      await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
    setBusy(false)
  }

  function openEdit(e) {
    setEdit({ id: e.id, date: e.expense_date, cat: e.category || '', amt: e.amount || '', paid_from: e.paid_from || accounts[0], notes: e.notes || '' })
  }
  async function saveEdit() {
    const cat = edit.cat.trim(), amt = parseFloat(edit.amt) || 0
    if (!cat || !amt) return toast('Reason and amount required', true)
    try {
      await api.updateExpense(uid, edit.id, { category: cat, amount: amt, paid_from: edit.paid_from, notes: edit.notes || '' })
      toast('Expense updated'); setEdit(null); await refresh()
    } catch (e) { toast('Error: ' + e.message, true) }
  }
  function del(e) {
    confirm('Delete expense?', `Delete this expense from ${e.expense_date}?`, async () => {
      try { await api.deleteExpense(uid, e.id); toast('Expense deleted'); await refresh() }
      catch (err) { toast('Error: ' + err.message, true) }
    })
  }

  const byDate = {}
  filtered.forEach((e) => { (byDate[e.expense_date] ||= []).push(e) })
  const grouped = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items, tot: items.reduce((a, e) => a + e.amount, 0) }))

  return (
    <>
      <div className="card">
        <div className="ch"><h3>➕ Add expense</h3><small style={{ color: 'var(--t2)' }}>manual entry with a reason</small></div>
        <div className="fg3">
          <div className="ff"><label>Date</label><input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} /></div>
          <div className="ff"><label>Reason / category</label>
            <input list="exp-cats" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Salary, Gas, Rent" />
            <datalist id="exp-cats">{Object.keys(categories).map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="ff"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
          <div className="ff"><label>Paid from</label>
            <select value={form.paid_from} onChange={(e) => setForm((f) => ({ ...f, paid_from: e.target.value }))}>{accounts.map((a) => <option key={a}>{a}</option>)}</select>
          </div>
          <div className="ff" style={{ gridColumn: 'span 2' }}><label>Notes (optional)</label><input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <div style={{ marginTop: 12 }}><button className="btn bf" disabled={busy} onClick={add}>{busy ? 'Adding…' : '+ Add expense'}</button></div>
      </div>

      <div className="card no-print">
        <div className="ch"><h3>Expenses</h3><small style={{ color: 'var(--t2)' }}>{filtered.length} entries · {R(total)}</small></div>
        <RangePicker range={range} onChange={setRange} />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: 'var(--t2)' }}>Filter:</label>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--bd-strong)', borderRadius: 8, background: 'var(--surface)' }}>
            <option value="">All reasons</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="ch"><h3>Records</h3></div>
          {filtered.length === 0 ? <div className="notice">No expenses for this period</div> : grouped.map((g) => (
            <div key={g.date} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{g.date}</span><span style={{ color: 'var(--red)' }}>{R(g.tot)}</span>
              </div>
              {g.items.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bd)', fontSize: 13 }}>
                  <div><span style={{ fontWeight: 500 }}>{e.category}</span>
                    <span className="badge bb" style={{ marginLeft: 8 }}>{e.paid_from || 'Cash'}</span>
                    {e.notes && <span style={{ color: 'var(--t2)', marginLeft: 8, fontSize: 12 }}>{e.notes}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>{R(e.amount)}</span>
                    <button className="btn bb btn-xs" onClick={() => openEdit(e)}>Edit</button>
                    <button className="btn br btn-xs" onClick={() => del(e)}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="ch"><h3>By reason</h3></div>
          {chartData.labels.length ? (
            <>
              <div style={{ height: 250, display: 'grid', placeItems: 'center' }}>
                <Doughnut data={{ labels: chartData.labels, datasets: [{ data: chartData.values, backgroundColor: COLORS, borderWidth: 0 }] }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } } } }} />
              </div>
              {chartData.labels.slice(0, 6).map((l, i) => <div className="dr" key={l}><span className="dl">{l}</span><span className="dv r">{R(chartData.values[i])}</span></div>)}
            </>
          ) : <div className="notice">No data</div>}
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit expense" sub={edit ? edit.date : ''}>
        {edit && (
          <>
            <div className="fg2">
              <div className="ff"><label>Reason / category</label><input list="exp-cats" value={edit.cat} onChange={(e) => setEdit((p) => ({ ...p, cat: e.target.value }))} /></div>
              <div className="ff"><label>Amount (₹)</label><input type="number" value={edit.amt} onChange={(e) => setEdit((p) => ({ ...p, amt: e.target.value }))} /></div>
            </div>
            <div className="fg2">
              <div className="ff"><label>Paid from</label><select value={edit.paid_from} onChange={(e) => setEdit((p) => ({ ...p, paid_from: e.target.value }))}>{accounts.map((a) => <option key={a}>{a}</option>)}</select></div>
              <div className="ff"><label>Notes</label><input value={edit.notes} onChange={(e) => setEdit((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn bo" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn bf" onClick={saveEdit}>Update</button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
