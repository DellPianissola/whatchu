import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ToastContainer from '../components/ToastContainer.jsx'

const NotificationContext = createContext(null)

const DEFAULT_DURATION = 4000

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((variant, message, options = {}) => {
    const id = ++idRef.current
    const duration = options.duration ?? DEFAULT_DURATION
    const toast = { id, variant, message, duration }
    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const toast = useMemo(() => ({
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    warning: (message, options) => push('warning', message, options),
    info: (message, options) => push('info', message, options),
    dismiss,
  }), [push, dismiss])

  return (
    <NotificationContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </NotificationContext.Provider>
  )
}

export const useNotify = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotify deve ser usado dentro de <NotificationProvider>')
  }
  return ctx
}
