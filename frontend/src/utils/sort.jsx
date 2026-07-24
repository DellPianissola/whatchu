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

export const splitSort = (sortBy) => {
  const [field, dir] = (sortBy || '').split('_')
  return { field: field || null, dir: dir || null }
}

export const toggleSortField = (sortBy, field) => {
  const { field: activeField, dir } = splitSort(sortBy)
  if (field !== activeField) return `${field}_desc`
  const next = cycleSort(dir)
  return next === null ? null : `${field}_${next}`
}

export const buildSortValues = (fields) =>
  fields.flatMap(({ field }) => [`${field}_asc`, `${field}_desc`])
