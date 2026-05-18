import Modal from './Modal.jsx'
import './ConfirmDialog.css'

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    labelledBy="confirm-dialog-title"
    className="ui-confirm-dialog"
  >
    {message && <p className="ui-confirm-dialog-message">{message}</p>}
    <div className="ui-confirm-dialog-actions">
      <button
        type="button"
        className="ui-confirm-dialog-btn ui-confirm-dialog-btn--cancel"
        onClick={onCancel}
        disabled={isLoading}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        className={`ui-confirm-dialog-btn ui-confirm-dialog-btn--${variant}`}
        onClick={onConfirm}
        disabled={isLoading}
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
)

export default ConfirmDialog
