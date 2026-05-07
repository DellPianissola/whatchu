import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PRIORITY_LABEL } from '../utils/content.js'
import './PriorityIndicator.css'

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const PriorityIndicator = ({ value, onChange, disabled = false, compact = true }) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const wrapperRef = useRef(null)
  const menuRef = useRef(null)

  // dropdown vive em portal — sem isso, o mouse migrar do card pro dropdown
  // solta o :hover do card e ele "cai"
  useEffect(() => {
    if (!open || !wrapperRef.current) return
    const card = wrapperRef.current.closest('.result-card, .movie-card')
    if (!card) return
    card.classList.add('card--menu-open')
    return () => card.classList.remove('card--menu-open')
  }, [open])

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

  return (
    <div className="priority-indicator-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`priority-indicator priority-indicator--${value.toLowerCase()} ${compact ? '' : 'priority-indicator--expanded'} ${open ? 'priority-indicator--open' : ''}`}
        disabled={disabled}
        title={`Prioridade ${PRIORITY_LABEL[value]} — clique pra trocar`}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
      >
        <span className="priority-indicator-label">
          {PRIORITY_LABEL[value]}
        </span>
      </button>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          className="priority-color-dropdown"
          style={{ bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width }}
          onClick={(e) => e.stopPropagation()}
        >
          {PRIORITY_OPTIONS.map((option) => {
            const isActive = value === option
            return (
              <button
                key={option}
                type="button"
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
