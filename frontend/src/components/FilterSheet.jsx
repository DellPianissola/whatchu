import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useEscapeKey } from '../hooks/useEscapeKey.js'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js'
import IconButton from './IconButton.jsx'
import './FilterSheet.css'

const CLOSE_ANIM_MS = 220

const FilterSheet = ({ open, onClose, onClear, title = 'Filtros', children }) => {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (mounted) {
      setClosing(true)
      closeTimerRef.current = setTimeout(() => {
        setMounted(false)
        setClosing(false)
      }, CLOSE_ANIM_MS)
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [open, mounted])

  useEscapeKey(onClose, mounted && !closing)
  useBodyScrollLock(mounted)

  if (!mounted) return null

  const onBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div
      className={`ui-filter-sheet-backdrop ${closing ? 'is-closing' : ''}`}
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`ui-filter-sheet ${closing ? 'is-closing' : ''}`}>
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
