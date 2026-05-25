import { Plus, Trash2 } from 'lucide-react'
import PriorityIndicator from './PriorityIndicator.jsx'
import './AddToListButton.css'

const DEFAULT_PRIORITY = 'MEDIUM'

const AddToListButton = ({
  inList = false,
  currentPriority = DEFAULT_PRIORITY,
  processing = false,
  disabled = false,
  compactPriority = true,
  onAdd,
  onChangePriority,
  onRemove,
}) => {
  if (!inList) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAdd?.(DEFAULT_PRIORITY) }}
        disabled={disabled || processing}
        className="btn-add"
      >
        {processing ? 'Processando...' : (<><Plus size={16} /> Adicionar</>)}
      </button>
    )
  }

  return (
    <div className="in-list-row">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove?.() }}
        disabled={disabled || processing}
        className="btn-add btn-remove in-list-row-remove"
      >
        {processing ? 'Processando...' : (<><Trash2 size={16} /> Remover</>)}
      </button>

      <PriorityIndicator
        value={currentPriority}
        onChange={onChangePriority}
        disabled={disabled || processing}
        compact={compactPriority}
      />
    </div>
  )
}

export default AddToListButton
