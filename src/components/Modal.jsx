export default function Modal({ open, onClose, title, sub, children, maxWidth = 560 }) {
  if (!open) return null
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        {title && <div className="modal-title">{title}</div>}
        {sub && <div className="modal-sub">{sub}</div>}
        {children}
      </div>
    </div>
  )
}
