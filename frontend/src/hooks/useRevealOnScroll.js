import { useEffect, useRef } from 'react'
import { useMediaQuery } from './useMediaQuery.js'
import { REDUCED_MOTION_QUERY } from '../constants/ui.js'

const PENDING = 'is-reveal-pending'

export const useRevealOnScroll = ({ selector = '[data-reveal]', rootMargin = '0px 0px -10% 0px' } = {}) => {
  const rootRef = useRef(null)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  useEffect(() => {
    const root = rootRef.current
    if (!root || reducedMotion || !('IntersectionObserver' in window)) return

    // Só esconde o que ainda está abaixo da dobra: o HTML pré-renderizado já está
    // visível, e esconder o que está na tela agora faria o conteúdo piscar.
    const pending = [...root.querySelectorAll(selector)]
      .filter((el) => el.getBoundingClientRect().top > window.innerHeight)
    pending.forEach((el) => el.classList.add(PENDING))

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return
        target.classList.remove(PENDING)
        observer.unobserve(target)
      })
    }, { rootMargin })
    pending.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      pending.forEach((el) => el.classList.remove(PENDING))
    }
  }, [selector, rootMargin, reducedMotion])

  return rootRef
}
