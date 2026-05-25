import { X } from 'lucide-react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import IconButton from './IconButton.jsx'
import './Modal.css'

const Modal = ({
  open,
  onClose,
  title,
  labelledBy,
  children,
  className = '',
  closeOnBackdrop = true,
  showClose = true,
}) => {
  useEscapeKey(onClose, open)
  useBodyScrollLock(open)

  if (!open) return null

  const onBackdropClick = (event) => {
    if (event.target === event.currentTarget && closeOnBackdrop) onClose()
  }

  return (
    <div className="ui-modal-backdrop" onClick={onBackdropClick}>
      <div
        className={`ui-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {(title || showClose) && (
          <header className="ui-modal-header">
            {title && <h2 className="ui-modal-title" id={labelledBy}>{title}</h2>}
            {showClose && <IconButton icon={<X size={20} />} label="Fechar" onClick={onClose} className="ui-modal-close" />}
          </header>
        )}
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
