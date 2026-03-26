import { useState, useCallback, useEffect, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'error', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, leaving: false }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 300)
    }, duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type} ${toast.leaving ? 'toast-leave' : ''}`}
            onClick={() => dismiss(toast.id)}
          >
            <div className="toast-icon">
              {toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚡' : 'ℹ️'}
            </div>
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
