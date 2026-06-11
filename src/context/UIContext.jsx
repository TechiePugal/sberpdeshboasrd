import { createContext, useContext, useState, useCallback, useRef } from 'react'

const UIContext = createContext(null)
export const useUI = () => useContext(UIContext)

export function UIProvider({ children }) {
  const [toastMsg, setToastMsg] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const timer = useRef(null)

  const toast = useCallback((msg, isError = false) => {
    setToastMsg({ msg, isError })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastMsg(null), 3200)
  }, [])

  const confirm = useCallback((title, message, onConfirm, okLabel = 'Delete') => {
    setConfirmState({ title, message, onConfirm, okLabel })
  }, [])

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      {toastMsg && <div className={'toast' + (toastMsg.isError ? ' err' : '')}>{toastMsg.msg}</div>}
      {confirmState && (
        <div className="modal-ov" onClick={() => setConfirmState(null)}>
          <div className="modal-box" style={{ maxWidth: 380, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{confirmState.title}</div>
            <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 22 }}>{confirmState.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn bo" onClick={() => setConfirmState(null)}>Cancel</button>
              <button
                className="btn br"
                onClick={() => { confirmState.onConfirm(); setConfirmState(null) }}
              >
                {confirmState.okLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  )
}
