import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import IconButton from './IconButton.jsx'
import './ScrollStrip.css'

const ScrollStrip = ({
  children,
  prevLabel,
  nextLabel,
  activeRef,
  activeKey,
  className = '',
  ...rest
}) => {
  const stripRef = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const strip = stripRef.current
    if (!strip) return
    const max = strip.scrollWidth - strip.clientWidth
    setEdges({ left: strip.scrollLeft > 1, right: strip.scrollLeft < max - 1 })
  }, [])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(strip)
    return () => observer.disconnect()
  }, [measure])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip || !activeRef) return
    const target = activeRef.current
    // scrollIntoView arrastaria o container pai na vertical junto — posiciona só a faixa.
    strip.scrollLeft = target
      ? target.offsetLeft - (strip.clientWidth - target.offsetWidth) / 2
      : 0
  }, [activeRef, activeKey])

  const scrollBy = (direction) => {
    const strip = stripRef.current
    if (strip) strip.scrollBy({ left: direction * strip.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className={`ui-scroll-strip-wrap ${className}`.trim()}>
      <IconButton
        icon={<ChevronLeft size={16} />}
        label={prevLabel}
        size="sm"
        className="ui-scroll-strip-arrow"
        onClick={() => scrollBy(-1)}
        disabled={!edges.left}
        tabIndex={-1}
      />

      <div className="ui-scroll-strip" ref={stripRef} onScroll={measure} {...rest}>
        {children}
      </div>

      <IconButton
        icon={<ChevronRight size={16} />}
        label={nextLabel}
        size="sm"
        className="ui-scroll-strip-arrow"
        onClick={() => scrollBy(1)}
        disabled={!edges.right}
        tabIndex={-1}
      />
    </div>
  )
}

export default ScrollStrip
