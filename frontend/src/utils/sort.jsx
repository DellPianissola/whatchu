import { ArrowUp, ArrowDown } from 'lucide-react'

export const cycleSort = (current) => {
  if (current === null)   return 'desc'
  if (current === 'desc') return 'asc'
  return null
}

export const getSortIcon = (dir, size = 14) => {
  if (dir === 'asc')  return <ArrowUp size={size} />
  if (dir === 'desc') return <ArrowDown size={size} />
  return null
}
