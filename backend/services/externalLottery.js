import tmdbService from './tmdb.js'
import jikanService from './jikan.js'
import { weightedPick } from './lottery/picker.js'
import { ValidationError } from '../lib/httpErrors.js'

// Sorteia dentro do top ~400 populares de cada tipo: variedade sem descer
// pra páginas com itens obscuros que passariam o piso de votos por sorte.
const PAGE_CAP = 20

const TYPE_TO_FETCHER = {
  MOVIE:  ({ page, genres }) => tmdbService.discover('movie', { page, sortBy: 'popularity', genres }),
  SERIES: ({ page, genres }) => tmdbService.discover('tv',    { page, sortBy: 'popularity', genres }),
  ANIME:  ({ page, genres }) => jikanService.getPopularAnimes(page, { sortBy: 'popularity', genres }),
}

const VALID_TYPES = Object.keys(TYPE_TO_FETCHER)

const randomPage = (cap = PAGE_CAP) => Math.floor(Math.random() * cap) + 1

// Quadrático: linear (1.5x entre 8 e 6) é fraco demais; cúbico vira tirania
// da nota alta. ≤ 5 e sem nota caem no peso base pra ainda serem elegíveis.
export const weightByRating = (item) => {
  const r = item?.rating
  if (!r || r <= 5) return 1
  const delta = r - 5
  return delta * delta + 1
}

const fetchCandidates = async (type, genres) => {
  const fetcher = TYPE_TO_FETCHER[type]
  const page    = randomPage()
  let { results } = await fetcher({ page, genres })

  // Gênero de nicho pode ter menos páginas que o cap — cai pra 1.
  if (results.length === 0 && page > 1) {
    ({ results } = await fetcher({ page: 1, genres }))
  }
  return results
}

const safeFetch = async (type, genres) => {
  try {
    return await fetchCandidates(type, genres)
  } catch (error) {
    console.error(`Lucky: falha ao buscar ${type}:`, error.message)
    return []
  }
}

export const luckyDraw = async ({ types, genres = [] } = {}) => {
  const requested = Array.isArray(types) && types.length > 0 ? types : VALID_TYPES
  const validTypes = requested.filter(t => VALID_TYPES.includes(t))

  if (validTypes.length === 0) {
    throw new ValidationError('Nenhum tipo válido informado (use MOVIE, SERIES ou ANIME)')
  }

  const candidatesByType = await Promise.all(
    validTypes.map(t => safeFetch(t, genres))
  )
  const candidates = candidatesByType.flat()

  if (candidates.length === 0) {
    return { movie: null, reason: 'NO_RESULTS' }
  }

  const movie = weightedPick(candidates, weightByRating)
  return { movie }
}
