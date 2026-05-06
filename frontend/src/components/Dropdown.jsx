import { useState, useEffect, useRef } from 'react'
import Button from './Button.jsx'
import './Dropdown.css'

/**
 * Dropdown reutilizável (single-select e multi-select).
 *
 * Props:
 *   options          — array de strings OU array de { value, label }
 *   value            — string (single) ou string[] (multi)
 *   onChange         — recebe o novo value (string ou string[])
 *   multi            — bool, default false
 *   trigger          — 'pill' | 'button' (visual do botão), default 'button'
 *   align            — 'left' | 'right' (alinhamento do menu), default 'left'
 *   label            — texto do trigger quando vazio
 *   icon             — emoji/string opcional antes do label
 *   disabled         — bool
 *   disabledTitle    — tooltip quando disabled
 *   emptyMessage     — string mostrada quando options está vazio
 *   className        — classe extra no wrapper
 */
const Dropdown = ({
  options = [],
  value,
  onChange,
  multi = false,
  trigger = 'button',
  align = 'left',
  label = 'Selecionar',
  icon,
  disabled = false,
  disabledTitle = '',
  emptyMessage = 'Sem opções',
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )

  const isSelected = (optValue) =>
    multi ? (value ?? []).includes(optValue) : value === optValue

  const handleSelect = (optValue) => {
    if (multi) {
      const current = value ?? []
      const next = current.includes(optValue)
        ? current.filter(v => v !== optValue)
        : [...current, optValue]
      onChange(next)
    } else {
      onChange(optValue)
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const selectedCount = multi ? (value ?? []).length : 0
  const selectedSingle = !multi
    ? normalized.find(o => o.value === value)?.label
    : null

  const triggerLabel = multi
    ? `${label}${selectedCount > 0 ? ` (${selectedCount})` : ''}`
    : (selectedSingle ?? label)

  const isActive = multi ? selectedCount > 0 : Boolean(value)

  return (
    <div className={`dropdown-wrapper ${className}`} ref={wrapperRef}>
      {trigger === 'pill' ? (
        <Button
          variant="filter"
          size="sm"
          pill
          active={isActive}
          icon={icon}
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          title={disabled ? disabledTitle : ''}
        >
          {triggerLabel} <span className="dropdown-trigger-caret" aria-hidden>▾</span>
        </Button>
      ) : (
        <button
          type="button"
          className={`dropdown-trigger-btn ${isActive ? 'active' : ''}`}
          onClick={() => !disabled && setOpen(o => !o)}
          disabled={disabled}
          title={disabled ? disabledTitle : ''}
        >
          {icon && <span className="dropdown-trigger-icon">{icon}</span>}
          <span className="dropdown-trigger-label">{triggerLabel}</span>
          <span className="dropdown-trigger-caret" aria-hidden>▾</span>
        </button>
      )}

      {open && (
        <div className={`dropdown-menu dropdown-menu-${align}`}>
          {normalized.length === 0 ? (
            <div className="dropdown-empty">{emptyMessage}</div>
          ) : (
            normalized.map(opt => (
              <label
                key={opt.value}
                className={`dropdown-option ${multi ? 'is-multi' : 'is-single'} ${isSelected(opt.value) ? 'is-selected' : ''}`}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  checked={isSelected(opt.value)}
                  onChange={() => handleSelect(opt.value)}
                />
                <span className="dropdown-option-label">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Dropdown
