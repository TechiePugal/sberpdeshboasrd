import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import * as api from '../lib/db'
import { R, filterRange } from '../lib/helpers'
import { defaultRange } from '../lib/ranges'
import RangePicker from '../components/RangePicker'

export default function Records({ onNav }) {
  const { uid, reports, refresh } = useData()
  const { toast, confirm } = useUI()
  const [range, setRange] = useState(defaultRange())

  const fr = filterRange(reports, 'entry_date', range).slice().reverse()

  function del(e, r) {
    e.stopPropagation()
    confirm('Delete report?', `Delete the full report for ${r.entry_date}? This cannot be undone.`, async () => {
      try { await api.deleteDailyReport(uid, r.id); toast('Report deleted'); await refresh() }
      catch (err) { toast('Error: ' + err.message, true) }
    })
  }

  return (
    <>
      <div className="card no-print">
        <div className="ch"><h3>Saved reports</h3><small style={{ color: 'var(--t2)' }}>{fr.length} day(s) · tap a row to open the full report</small></div>
        <RangePicker range={range} onChange={setRange} />
      </div>

      <div className="card">
        {fr.length === 0 ? (
          <div className="notice" style={{ padding: 32 }}>No reports in this range. <button className="btn bf btn-sm" style={{ marginLeft: 8 }} onClick={() => onNav('upload')}>Upload one</button></div>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>Date</th><th className="n">Sales</th><th className="n">COGS</th><th className="n">Gross</th><th className="n">Items</th><th></th></tr></thead>
              <tbody>
                {fr.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onNav('reportDetail', r.entry_date)}>
                    <td style={{ fontWeight: 600 }}>{r.entry_date}</td>
                    <td className="n" style={{ color: 'var(--grn)', fontWeight: 700 }}>{R(r.total_sales || 0)}</td>
                    <td className="n" style={{ color: 'var(--amb)' }}>{R(r.cogs || 0)}</td>
                    <td className="n" style={{ color: 'var(--blu)', fontWeight: 700 }}>{R(r.gross_profit || 0)}</td>
                    <td className="n" style={{ color: 'var(--t2)' }}>{(r.items || []).length}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn bb btn-xs" style={{ marginRight: 4 }} onClick={(e) => { e.stopPropagation(); onNav('reportDetail', r.entry_date) }}>Open</button>
                      <button className="btn br btn-xs" onClick={(e) => del(e, r)}>Delete</button>
                    </td>
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
