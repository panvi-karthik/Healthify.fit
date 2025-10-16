import { createContext, useContext, useMemo, useState } from 'react'

const ToastsCtx = createContext(null)

let idSeq = 1

export function ToastsProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id))

  const push = (msg, variant = 'success', delay = 3000) => {
    const id = idSeq++
    setToasts((t) => [...t, { id, msg, variant }])
    if (delay) {
      setTimeout(() => remove(id), delay)
    }
  }

  const api = useMemo(() => ({
    success: (m) => push(m, 'success'),
    info: (m) => push(m, 'info'),
    error: (m) => push(m, 'danger', 5000),
  }), [])

  return (
    <ToastsCtx.Provider value={api}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast align-items-center text-bg-${t.variant} show mb-2`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex">
              <div className="toast-body">{t.msg}</div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={() => remove(t.id)}></button>
            </div>
          </div>
        ))}
      </div>
    </ToastsCtx.Provider>
  )
}

export function useToasts() {
  const ctx = useContext(ToastsCtx)
  if (!ctx) throw new Error('useToasts must be used within ToastsProvider')
  return ctx
}
