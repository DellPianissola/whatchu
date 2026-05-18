import { useMemo } from 'react'
import { PAGE_WINDOW_SIZE } from '../constants/ui'

const buildPageWindow = (current, total, size) => {
  if (total <= 0) return []
  const half = Math.floor(size / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + size - 1)
  start = Math.max(1, end - size + 1)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export const usePagination = (current, total, size = PAGE_WINDOW_SIZE) =>
  useMemo(() => ({
    pages:    buildPageWindow(current, total, size),
    isFirst:  current <= 1,
    isLast:   current >= total,
    hasPages: total > 0,
  }), [current, total, size])
