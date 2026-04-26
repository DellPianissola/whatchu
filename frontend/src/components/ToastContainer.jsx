import Toast from './Toast.jsx'
import './Toast.css'

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container" role="region" aria-label="Notificações">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          id={t.id}
          variant={t.variant}
          message={t.message}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

export default ToastContainer
