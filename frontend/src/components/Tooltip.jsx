import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './Tooltip.css'

const Tooltip = ({ label, children, className = '' }) => {
  const [pos, setPos] = useState(null)
  const anchorRef = useRef(null)

  const show = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) setPos({ x: rect.left + rect.width / 2, y: rect.top })
  }, [])

  const hide = useCallback(() => setPos(null), [])

  return (
    <span
      ref={anchorRef}
      className={`ui-tooltip-anchor ${className}`.trim()}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {pos && label && createPortal(
        <span className="ui-tooltip" style={{ left: pos.x, top: pos.y }} role="tooltip">
          {label}
        </span>,
        document.body,
      )}
    </span>
  )
}

export default Tooltip
