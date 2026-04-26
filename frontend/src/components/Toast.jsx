import { useEffect, useState } from 'react'

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const ROLES = {
  success: 'status',
  info: 'status',
  warning: 'alert',
  error: 'alert',
}

const Toast = ({ id, variant, message, onDismiss }) => {
  const [leaving, setLeaving] = useState(false)

  // Anima a saída antes de remover do DOM (usado quando o usuário clica no X)
  const handleDismiss = () => {
    setLeaving(true)
    setTimeout(() => onDismiss(id), 200)
  }

  // Quando o auto-dismiss vier de fora, ainda aplicamos a anim de saída
  useEffect(() => {
    return () => {
      // cleanup vazio — só pra deixar o ponto de extensão claro
    }
  }, [])

  return (
    <div
      className={`toast toast-${variant} ${leaving ? 'toast-leaving' : ''}`}
      role={ROLES[variant] || 'status'}
      aria-live={variant === 'error' || variant === 'warning' ? 'assertive' : 'polite'}
    >
      <span className="toast-icon" aria-hidden="true">{ICONS[variant]}</span>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={handleDismiss}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  )
}

export default Toast
