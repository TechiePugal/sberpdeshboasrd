import { useState } from 'react'
import { useUI } from '../context/UIContext'
import { fileToBill } from '../lib/bills'
import Modal from './Modal'

// File picker that compresses to a small data URL. Calls onPick({data,name,type}) or onPick(null).
export function BillPicker({ bill, onPick, label = 'Bill (optional)' }) {
  const { toast } = useUI()
  const [busy, setBusy] = useState(false)
  async function pick(file) {
    if (!file) { onPick(null); return }
    setBusy(true)
    try { onPick(await fileToBill(file)) }
    catch (e) { toast(e.message, true); onPick(null) }
    setBusy(false)
  }
  return (
    <div className="ff">
      <label>{label}</label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1.5px dashed var(--bd)', borderRadius: 'var(--rs)', cursor: 'pointer', background: bill ? 'var(--grn-soft)' : 'var(--surface-2)' }}>
        <input type="file" accept="image/*,application/pdf" capture="environment" style={{ display: 'none' }} onChange={(e) => pick(e.target.files[0])} />
        <span style={{ fontSize: 17 }}>{busy ? '⏳' : bill ? '✅' : '📎'}</span>
        <span style={{ fontSize: 12.5, color: bill ? 'var(--grn)' : 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {busy ? 'Processing…' : bill ? (bill.name || 'Bill attached') : 'Attach photo / PDF'}
        </span>
        {bill && <span role="button" onClick={(e) => { e.preventDefault(); onPick(null) }} style={{ marginLeft: 'auto', color: 'var(--red)', fontSize: 12 }}>remove</span>}
      </label>
    </div>
  )
}

// Button + modal to view a stored bill ({data,name,type}).
export function BillView({ bill }) {
  const [open, setOpen] = useState(false)
  if (!bill?.data) return <span style={{ color: 'var(--t2)' }}>—</span>
  return (
    <>
      <button className="btn bb btn-xs" onClick={() => setOpen(true)}>📎 View</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bill" sub={bill.name || ''} maxWidth={560}>
        {bill.type === 'pdf'
          ? <a className="btn bf" href={bill.data} download={bill.name || 'bill.pdf'}>Download PDF</a>
          : <img src={bill.data} alt="bill" style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '0 auto' }} />}
      </Modal>
    </>
  )
}
