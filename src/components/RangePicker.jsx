import { useState } from 'react'
import { RP_PRESETS, resolvePreset } from '../lib/ranges'
import { useUI } from '../context/UIContext'

export default function RangePicker({ range, onChange, extra }) {
  const { toast } = useUI()
  const [showCustom, setShowCustom] = useState(false)
  const [cf, setCf] = useState(range.from)
  const [ct, setCt] = useState(range.to)

  function pick(val, label) {
    if (val === 'custom') { setShowCustom(true); return }
    setShowCustom(false)
    const { from, to } = resolvePreset(val)
    onChange({ from, to, label })
  }

  function applyCustom() {
    if (!cf || !ct) return toast('Select both dates', true)
    onChange({ from: cf, to: ct, label: `${cf} → ${ct}` })
  }

  return (
    <div>
      <div className="rp-wrap">
        {RP_PRESETS.map(([v, l]) => (
          <button key={v} className={'rp-btn' + (range.label === l ? ' on' : '')} onClick={() => pick(v, l)}>{l}</button>
        ))}
        {extra}
      </div>
      {showCustom && (
        <div className="rp-custom">
          <input type="date" value={cf} onChange={(e) => setCf(e.target.value)} />
          <span style={{ color: 'var(--t2)' }}>to</span>
          <input type="date" value={ct} onChange={(e) => setCt(e.target.value)} />
          <button className="btn bf btn-sm" onClick={applyCustom}>Apply</button>
        </div>
      )}
    </div>
  )
}
