import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', right: 16,
        zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8,
        maxWidth: 340, pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className="wf-toast"
            data-type={toast.type}
          >
            <span className="wf-toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.show
}
