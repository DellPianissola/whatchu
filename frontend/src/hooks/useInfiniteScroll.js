import { useEffect, useRef } from 'react'

export const useInfiniteScroll = (onLoadMore, { enabled = true, rootMargin = '400px' } = {}) => {
  const sentinelRef = useRef(null)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !enabled) return

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMoreRef.current() },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled, rootMargin])

  return sentinelRef
}
