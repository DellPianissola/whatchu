import tmdbService from './tmdb.js'
import { ValidationError } from '../lib/httpErrors.js'

/**
 * Camada de orquestração do provider externo (TMDB).
 *
 * `tmdb.js` é o adapter de baixo nível (HTTP). Aqui em cima ficam as regras
 * de roteamento por `type` e como aplicar sort/genres respeitando limitações
 * de cada endpoint do TMDB.
 */

const TMDB_TYPE_MAP = {
  movie: 'movie',
  series: 'tv', // pra TMDB, "series" vira "tv"
}

const parseGenres = (raw) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ─── Busca textual ──────────────────────────────────────────────────────────

/**
 * Busca textual no TMDB. Roteamento por `type`:
 *   - movie  → /search/movie
 *   - series → /search/tv
 *   - sem type → /search/multi
 *
 * TMDB /search não suporta sort/genres — esses params são ignorados aqui.
 */
export const searchByText = async ({ q, type, page = 1 }) => {
  if (!q) {
    throw new ValidationError('Parâmetro "q" (query) é obrigatório')
  }

  const tmdbType = TMDB_TYPE_MAP[type] || 'multi'
  const data = await tmdbService.search(q, tmdbType, page)

  return formatSearchResponse({
    q,
    type: type || 'all',
    page,
    totalPages: data.totalPages,
    results: data.results,
  })
}

const formatSearchResponse = ({ q, type, page, totalPages, results }) => ({
  query: q,
  type: type || 'all',
  page: parseInt(page),
  totalPages,
  results,
})

// ─── Discover (listagens populares com sort/genres) ─────────────────────────

/**
 * Lista de conteúdo (sem busca textual). Aplica sort/genres no nível da API.
 * Gêneros virtuais (ex.: "Anime") são resolvidos dentro do tmdbService.
 */
export const discoverByType = async (type, { page = 1, sortBy, genres } = {}) => {
  const genreList = parseGenres(genres)
  const tmdbType = TMDB_TYPE_MAP[type] || 'movie'
  const data = await tmdbService.discover(tmdbType, { page, sortBy, genres: genreList })

  return {
    page: parseInt(page),
    totalPages: data.totalPages,
    results: data.results,
  }
}

// ─── Gêneros ────────────────────────────────────────────────────────────────

export const listGenres = async (type) => {
  const tmdbType = TMDB_TYPE_MAP[type] || 'movie'
  return tmdbService.getGenresList(tmdbType)
}

// ─── Detalhes ───────────────────────────────────────────────────────────────

const VALID_DETAIL_TYPES = ['movie', 'series']

export const getDetails = async (type, id) => {
  if (!VALID_DETAIL_TYPES.includes(type)) {
    throw new ValidationError(`Tipo inválido: ${type}. Use movie ou series`)
  }

  if (type === 'movie') return tmdbService.getMovieDetails(id)
  return tmdbService.getSeriesDetails(id)
}
