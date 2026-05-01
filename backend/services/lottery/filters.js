// Constrói o `where` do Prisma a partir dos filtros vindos da UI.
// Filtros já chegam aqui validados/normalizados (ver movies.normalizeDrawFilters).
//
//   - types         → IN MOVIE/SERIES/ANIME
//   - genres        → array overlap (filme com QUALQUER um dos gêneros)
//   - priorities    → IN LOW/MEDIUM/HIGH/URGENT
//   - ignoreWatched → exclui assistidos

export const buildWhere = (profileId, filters = {}) => {
  const where = { addedById: profileId }

  if (filters.types?.length)      where.type     = { in: filters.types }
  if (filters.genres?.length)     where.genres   = { hasSome: filters.genres }
  if (filters.priorities?.length) where.priority = { in: filters.priorities }
  if (filters.ignoreWatched)      where.watched  = false

  return where
}
