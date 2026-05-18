import { useEffect } from 'react'

export const useClickOutside = (ref, handler, enabled = true) => {
  useEffect(() => {
    if (!enabled) return

    const onMouseDown = (event) => {
      const node = ref.current
      if (!node || node.contains(event.target)) return
      handler(event)
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [ref, handler, enabled])
}
