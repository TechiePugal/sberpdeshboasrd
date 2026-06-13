import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { RP_PRESETS, resolvePreset } from '../lib/ranges'

// Global "set → Apply" filter. Draft is local; only Apply commits to the
// shared filter (persisted), which every page reads.
export default function FilterBar() {
  const { filter, applyFilter } = useData()
  const { toast } = useUI()
  const [draftLabel, setDraftLabel] = useState(filter.label)
  const [custom, setCustom] = useState({ from: filter.from, to: filter.to })
  const isCustom = draftLabel === 'Custom' || !RP_PRESETS.some(([, l]) => l === draftLabel)

  const dirty = draftLabel !== filter.label || (isCustom && (custom.from !== filter.from || custom.to !== filter.to))

  function apply() {
    if (isCustom) {
      if (!custom.from || !custom.to) return toast('Pick both dates', true)
      applyFilter({ from: custom.from, to: custom.to, label: `${custom.from} → ${custom.to}` })
    } else {
      const preset = RP_PRESETS.find(([, l]) => l === draftLabel)
      const { from, to } = resolvePreset(preset[0])
      applyFilter({ from, to, label: draftLabel })
    }
    toast('✓ Filter applied')
  }

  return (
    <div className="filterbar no-print">
      <div className="fb-row">
        <span className="fb-label">📅 Period</span>
        <div className="fb-presets">
          {RP_PRESETS.map(([v, l]) => (
            <button key={v} className={'fb-chip' + (draftLabel === l ? ' on' : '')} onClick={() => setDraftLabel(l)}>{l}</button>
          ))}
        </div>
      </div>
      {isCustom && (
        <div className="fb-custom">
          <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
          <span style={{ color: 'var(--t2)' }}>to</span>
          <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
        </div>
      )}
      <div className="fb-apply">
        <span className="fb-current">Showing: <strong>{filter.label}</strong> <span style={{ color: 'var(--t2)' }}>({filter.from} → {filter.to})</span></span>
        <button className={'btn btn-sm ' + (dirty ? 'bf' : 'bo')} onClick={apply} disabled={!dirty}>Apply filter</button>
      </div>
    </div>
  )
}
