// Filtros já chegam normalizados pelo service (movies.normalizeDrawFilters).

export const buildWhere = (profileIds, filters = {}) => {
  const where = { addedById: { in: profileIds } }

  if (filters.types?.length)            where.type      = { in: filters.types }
  if (filters.genres?.length)           where.genres    = { hasSome: filters.genres }
  if (filters.priorities?.length)       where.priority  = { in: filters.priorities }
  if (filters.providerTmdbIds?.length)  where.providers = { hasSome: filters.providerTmdbIds }
  if (filters.ignoreWatched)            where.watched   = false

  return where
}
