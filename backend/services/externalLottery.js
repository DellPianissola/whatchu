import tmdbService from './tmdb.js'
import { weightedPick } from './lottery/picker.js'
import { resolveTmdbIds } from '../lib/streamingProviders.js'
import { ValidationError } from '../lib/httpErrors.js'

// Sorteia dentro do top ~400 populares de cada tipo: variedade sem descer
// pra páginas com itens obscuros que passariam o piso de votos por sorte.
const PAGE_CAP = 20

const TYPE_TO_FETCHER = {
  MOVIE:  (opts) => tmdbService.discover('movie', { sortBy: 'popularity', ...opts }),
  SERIES: (opts) => tmdbService.discover('tv',    { sortBy: 'popularity', ...opts }),
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

const fetchCandidates = async (type, opts) => {
  const fetcher = TYPE_TO_FETCHER[type]
  const page    = randomPage()
  let { results } = await fetcher({ ...opts, page })

  // Gênero/streaming de nicho pode ter menos páginas que o cap — cai pra 1.
  if (results.length === 0 && page > 1) {
    ({ results } = await fetcher({ ...opts, page: 1 }))
  }
  return results
}

const safeFetch = async (type, opts) => {
  try {
    return await fetchCandidates(type, opts)
  } catch (error) {
    console.error(`Lucky: falha ao buscar ${type}:`, error.message)
    return []
  }
}

export const luckyDraw = async ({ types, genres = [], providers = [] } = {}) => {
  const requested = Array.isArray(types) && types.length > 0 ? types : VALID_TYPES
  const validTypes = requested.filter(t => VALID_TYPES.includes(t))

  if (validTypes.length === 0) {
    throw new ValidationError('Nenhum tipo válido informado (use MOVIE ou SERIES)')
  }

  const providerTmdbIds = resolveTmdbIds(providers)
  const fetchOpts = { genres, providers: providerTmdbIds }

  const candidatesByType = await Promise.all(
    validTypes.map(t => safeFetch(t, fetchOpts))
  )
  const candidates = candidatesByType.flat()

  if (candidates.length === 0) {
    return { movie: null, reason: 'NO_RESULTS' }
  }

  const movie = weightedPick(candidates, weightByRating)
  return { movie }
}
