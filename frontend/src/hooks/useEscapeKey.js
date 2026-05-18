import { useEffect } from 'react'

export const useEscapeKey = (handler, enabled = true) => {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') handler(event)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handler, enabled])
}
