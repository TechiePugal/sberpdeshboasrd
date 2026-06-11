import Modal from './Modal'

const TONE = {
  good: { bg: 'var(--grn-soft)', bd: 'var(--grn)', c: 'var(--grn)' },
  warn: { bg: 'var(--amb-soft)', bd: 'var(--amb)', c: 'var(--amb)' },
  bad: { bg: 'var(--red-soft)', bd: 'var(--red)', c: 'var(--red)' },
  info: { bg: 'var(--blu-soft)', bd: 'var(--blu)', c: 'var(--blu)' },
}

export default function Recommendations({ open, onClose, recs, rangeLabel }) {
  return (
    <Modal open={open} onClose={onClose} title="💡 Recommendations & Insights" sub={`Auto-generated from your data · ${rangeLabel || ''}`} maxWidth={640}>
      <div style={{ display: 'grid', gap: 10, maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
        {recs.length === 0 ? (
          <div className="notice">No insights for this period.</div>
        ) : recs.map((r, i) => {
          const t = TONE[r.tone] || TONE.info
          return (
            <div key={i} style={{ display: 'flex', gap: 12, padding: 14, background: t.bg, border: `1px solid ${t.bd}33`, borderLeft: `3px solid ${t.bd}`, borderRadius: 'var(--rs)' }}>
              <div style={{ fontSize: 22, lineHeight: 1 }}>{r.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.c, marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.55 }}>{r.text}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="modal-actions">
        <button className="btn bf" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  )
}
