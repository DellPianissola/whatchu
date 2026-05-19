import { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { PRIORITY_LABEL, PRIORITY_VALUES } from '../utils/content.js'
import { useClickOutside } from '../hooks/useClickOutside.js'
import { useEscapeKey } from '../hooks/useEscapeKey.js'
import './PriorityIndicator.css'

const DEFAULT_PARENT_SELECTOR = '.result-card, .movie-card'

const PriorityIndicator = ({
  value,
  onChange,
  disabled = false,
  compact = true,
  parentSelector = DEFAULT_PARENT_SELECTOR,
}) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const wrapperRef = useRef(null)
  const menuId = useId()

  useClickOutside(wrapperRef, () => setOpen(false), open)
  useEscapeKey(() => setOpen(false), open)

  // dropdown vive em portal — sem isso, o mouse migrar do card pro dropdown
  // solta o :hover do card e ele "cai"
  useEffect(() => {
    if (!open || !wrapperRef.current) return
    const card = wrapperRef.current.closest(parentSelector)
    if (!card) return
    card.classList.add('card--menu-open')
    return () => card.classList.remove('card--menu-open')
  }, [open, parentSelector])

  // posiciona via fixed pra escapar do overflow:hidden do card e do
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

    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  const safeValue = value || ''
  const triggerLabel = PRIORITY_LABEL[value] ?? 'Definir'

  return (
    <div className="priority-indicator-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`priority-indicator priority-indicator--${safeValue.toLowerCase()} ${compact ? '' : 'priority-indicator--expanded'} ${open ? 'priority-indicator--open' : ''}`}
        disabled={disabled}
        title={`Prioridade ${triggerLabel} — clique pra trocar`}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <span className="priority-indicator-label">{triggerLabel}</span>
      </button>

      {open && menuPos && createPortal(
        <div
          id={menuId}
          role="menu"
          className="priority-color-dropdown"
          style={{ bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {PRIORITY_VALUES.map((option) => {
            const isActive = value === option
            return (
              <button
                key={option}
                type="button"
                role="menuitem"
                className={`priority-color-option priority-color-option--${option.toLowerCase()} ${isActive ? 'priority-color-option--active' : ''}`}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  if (!isActive) onChange?.(option)
                }}
              >
                {PRIORITY_LABEL[option]}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}

export default PriorityIndicator
