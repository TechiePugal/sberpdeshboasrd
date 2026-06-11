import { useState } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'

export default function CategoryManager({ open, onClose }) {
  const { categories, updateCategories } = useData()
  const { toast } = useUI()
  const [newCat, setNewCat] = useState('')
  const [subInputs, setSubInputs] = useState({})

  async function addCat() {
    const name = newCat.trim()
    if (!name) return toast('Enter a category name', true)
    if (categories[name]) return toast('Category already exists', true)
    await updateCategories({ ...categories, [name]: [] })
    setNewCat('')
    toast(`Category "${name}" added`)
  }

  async function addSub(cat) {
    const name = (subInputs[cat] || '').trim()
    if (!name) return
    if ((categories[cat] || []).includes(name)) return toast('Sub-category already exists', true)
    await updateCategories({ ...categories, [cat]: [...(categories[cat] || []), name] })
    setSubInputs((s) => ({ ...s, [cat]: '' }))
  }

  async function removeCat(cat) {
    if (!window.confirm(`Delete category "${cat}" and all its sub-categories?`)) return
    const next = { ...categories }
    delete next[cat]
    await updateCategories(next)
    toast(`Category "${cat}" deleted`)
  }

  async function removeSub(cat, sub) {
    await updateCategories({ ...categories, [cat]: (categories[cat] || []).filter((s) => s !== sub) })
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" sub="Create categories and sub-categories for expenses" maxWidth={480}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name…"
          onKeyDown={(e) => e.key === 'Enter' && addCat()}
          style={{ flex: 1, fontSize: 14, padding: '10px 12px', border: '1px solid var(--bd-strong)', borderRadius: 12, background: 'var(--surface)', outline: 'none', fontFamily: 'inherit' }}
        />
        <button className="btn bf" onClick={addCat}>Add</button>
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {Object.keys(categories).length === 0 ? (
          <div className="notice">No categories yet. Add one above.</div>
        ) : Object.keys(categories).map((cat) => (
          <div key={cat} style={{ marginBottom: 12, background: 'var(--surface-2)', border: '1px solid var(--bd)', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>{cat}</span>
              <button className="btn br btn-xs" onClick={() => removeCat(cat)}>Remove</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(categories[cat] || []).map((sub) => (
                <span key={sub} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface-3)', borderRadius: 980, padding: '3px 10px', fontSize: 12 }}>
                  {sub}
                  <button onClick={() => removeSub(cat, sub)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={subInputs[cat] || ''} onChange={(e) => setSubInputs((s) => ({ ...s, [cat]: e.target.value }))}
                placeholder="Add sub-category…" onKeyDown={(e) => e.key === 'Enter' && addSub(cat)}
                style={{ flex: 1, fontSize: 13, padding: '7px 10px', border: '1px solid var(--bd-strong)', borderRadius: 8, background: 'var(--surface)', outline: 'none', fontFamily: 'inherit' }}
              />
              <button className="btn bo btn-sm" onClick={() => addSub(cat)}>+ Sub</button>
            </div>
          </div>
        ))}
      </div>

      <div className="modal-actions"><button className="btn bo" onClick={onClose}>Done</button></div>
    </Modal>
  )
}
