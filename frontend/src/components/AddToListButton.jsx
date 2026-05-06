import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PRIORITY_LABEL } from '../utils/content.js'
import './AddToListButton.css'

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const DEFAULT_PRIORITY = 'MEDIUM'

const AddToListButton = ({
  inList = false,
  currentPriority = DEFAULT_PRIORITY,
  processing = false,
  disabled = false,
  onAdd,
  onChangePriority,
  onRemove,
}) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const wrapperRef = useRef(null)
  const menuRef = useRef(null)

  // dropdown vive em portal — sem isso, o mouse migrar do card pro dropdown
  // solta o :hover do card e ele "cai"
  useEffect(() => {
    if (!open || !wrapperRef.current) return
    const card = wrapperRef.current.closest('.result-card')
    if (!card) return
    card.classList.add('result-card--menu-open')
    return () => card.classList.remove('result-card--menu-open')
  }, [open])

  // posiciona via fixed pra escapar do overflow:hidden do .result-card e do
  // stacking context criado pelo transform:translateY do hover do card
  useEffect(() => {
    if (!open || !wrapperRef.current) return

    const updatePos = () => {
      const r = wrapperRef.current.getBoundingClientRect()
      setMenuPos({
        bottom: window.innerHeight - r.top + 6,
        left: r.left,
        width: r.width,
      })
    }
    updatePos()

    const onClickOutside = (e) => {
      const inWrapper = wrapperRef.current?.contains(e.target)
      const inMenu    = menuRef.current?.contains(e.target)
      if (!inWrapper && !inMenu) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  useEffect(() => { if (!inList) setOpen(false) }, [inList])

  if (!inList) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAdd?.(DEFAULT_PRIORITY) }}
        disabled={disabled || processing}
        className="btn-add"
      >
        {processing ? 'Processando...' : '➕ Adicionar'}
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
        {processing ? 'Processando...' : '🗑️ Remover'}
      </button>

      <div className="priority-indicator-wrapper" ref={wrapperRef}>
        <button
          type="button"
          className={`priority-indicator priority-indicator--${currentPriority.toLowerCase()} ${open ? 'priority-indicator--open' : ''}`}
          disabled={disabled || processing}
          title={`Prioridade ${PRIORITY_LABEL[currentPriority]} — clique pra trocar`}
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        >
          <span className="priority-indicator-label">
            {PRIORITY_LABEL[currentPriority]}
          </span>
        </button>

        {open && menuPos && createPortal(
          <div
            ref={menuRef}
            className="priority-color-dropdown"
            style={{ bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width }}
            onClick={(e) => e.stopPropagation()}
          >
            {PRIORITY_OPTIONS.map((value) => {
              const isActive = currentPriority === value
              return (
                <button
                  key={value}
                  type="button"
                  className={`priority-color-option priority-color-option--${value.toLowerCase()} ${isActive ? 'priority-color-option--active' : ''}`}
                  disabled={disabled || processing}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    if (!isActive) onChangePriority?.(value)
                  }}
                >
                  {PRIORITY_LABEL[value]}
                  {isActive && <span className="priority-color-option-check">✓</span>}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
      </div>
    </div>
  )
}

export default AddToListButton
