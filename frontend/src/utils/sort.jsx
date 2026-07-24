import { ArrowUp, ArrowDown } from 'lucide-react'

export const getSortIcon = (dir, size = 14) => {
  if (dir === 'asc')  return <ArrowUp size={size} />
  if (dir === 'desc') return <ArrowDown size={size} />
  return null
}

export const splitSort = (sortBy) => {
  const [field, dir] = (sortBy || '').split('_')
  return { field: field || null, dir: dir || null }
}

// Sem estado nulo: a lista sempre tem uma ordem, então desligar a ordenação
// deixaria um campo ativo de fato sem nenhum botão aceso.
export const toggleSortField = (sortBy, field, directionless = false) => {
  if (directionless) return field
  const { field: activeField, dir } = splitSort(sortBy)
  if (field !== activeField) return `${field}_desc`
  return `${field}_${dir === 'desc' ? 'asc' : 'desc'}`
}

export const buildSortValues = (fields) =>
  fields.flatMap(({ field, directionless }) =>
    directionless ? [field] : [`${field}_asc`, `${field}_desc`]
  )
