import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const ROLES = {
  success: 'status',
  info: 'status',
  warning: 'alert',
  error: 'alert',
}

const Toast = ({ id, variant, message, onDismiss }) => {
  const [leaving, setLeaving] = useState(false)

  // anima saída antes de remover do DOM
  const handleDismiss = () => {
    setLeaving(true)
    setTimeout(() => onDismiss(id), 200)
  }

  const Icon = ICONS[variant]

  return (
    <div
      className={`toast toast-${variant} ${leaving ? 'toast-leaving' : ''}`}
      role={ROLES[variant] || 'status'}
      aria-live={variant === 'error' || variant === 'warning' ? 'assertive' : 'polite'}
    >
      <span className="toast-icon" aria-hidden="true">{Icon && <Icon size={20} />}</span>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={handleDismiss}
        aria-label="Fechar notificação"
      >
        <X size={18} />
      </button>
    </div>
  )
}

export default Toast
