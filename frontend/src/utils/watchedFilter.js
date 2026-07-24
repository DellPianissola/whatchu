export const WATCHED_VALUES = ['false', 'true']
export const WATCHED_NONE = 'none'

// Param ausente = ambos ligados. Só o estado "nenhum" precisa de valor próprio,
// senão seria indistinguível do default.
export const parseWatchedParam = (value) => {
  if (WATCHED_VALUES.includes(value)) return [value]
  if (value === WATCHED_NONE) return []
  return WATCHED_VALUES
}

export const encodeWatched = (list) => {
  if (list.length === 0) return WATCHED_NONE
  if (list.length === 1) return list[0]
  return ''
}

export const matchesWatched = (movie, list) => list.includes(String(Boolean(movie.watched)))
