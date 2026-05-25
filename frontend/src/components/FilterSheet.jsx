import { X } from 'lucide-react'
import { useEscapeKey } from '../hooks/useEscapeKey.js'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js'
import IconButton from './IconButton.jsx'
import './FilterSheet.css'

const FilterSheet = ({ open, onClose, onClear, title = 'Filtros', children }) => {
  useEscapeKey(onClose, open)
  useBodyScrollLock(open)

  if (!open) return null

  const onBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className="ui-filter-sheet-backdrop" onClick={onBackdropClick} role="dialog" aria-modal="true">
      <div className="ui-filter-sheet">
        <div className="ui-filter-sheet-handle" aria-hidden="true" />
        <header className="ui-filter-sheet-header">
          <h2 className="ui-filter-sheet-title">{title}</h2>
          <IconButton icon={<X size={20} />} label="Fechar filtros" onClick={onClose} />
        </header>
        <div className="ui-filter-sheet-body">{children}</div>
        <footer className="ui-filter-sheet-footer">
          {onClear && (
            <button type="button" className="ui-filter-sheet-clear" onClick={onClear}>
              Limpar
            </button>
          )}
          <button type="button" className="ui-filter-sheet-apply" onClick={onClose}>
            Aplicar
          </button>
        </footer>
      </div>
    </div>
  )
}

export default FilterSheet
