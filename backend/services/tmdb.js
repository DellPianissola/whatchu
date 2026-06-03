import axios from 'axios'
import { describeAxiosError, makeUpstreamErrorFactory } from '../lib/upstreamErrors.js'
import { extractVirtualGenres, VIRTUAL_GENRE_NAMES } from '../lib/virtualGenres.js'
import { logger } from '../lib/logger.js'

const TMDB_BASE_URL          = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL    = 'https://image.tmdb.org/t/p/w500'
const TMDB_BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w780'
const TMDB_LOGO_BASE_URL     = 'https://image.tmdb.org/t/p/w92'
const TMDB_MAX_PAGES      = 500
const LANGUAGE            = 'pt-BR'

// BR-only por enquanto; se virar multi-país, passa pra config de perfil.
const WATCH_REGION         = 'BR'
const CERTIFICATION_REGION = 'BR'

export const MONETIZATION_TYPES = {
  FLATRATE: 'flatrate',
  FREE:     'free',
  ADS:      'ads',
  RENT:     'rent',
  BUY:      'buy',
}
const DEFAULT_MONETIZATION = [MONETIZATION_TYPES.FLATRATE]

const toUpstreamError = makeUpstreamErrorFactory('TMDB')

const roundRating = (v) => (v ? parseFloat(v.toFixed(1)) : null)

const yearFromDate = (d) => (d ? new Date(d).getFullYear() : null)

const trailerKey = (videos) =>
  videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key || null

const castNames = (credits, limit = 5) =>
  credits?.cast?.slice(0, limit).map(a => a.name) || []

const paginated = (data, results) => ({
  results,
  totalPages:   Math.min(data.total_pages || 1, TMDB_MAX_PAGES),
  totalResults: data.total_results || 0,
})

class TMDBService {
  constructor() {
    this.apiKey = process.env.TMDB_API_KEY
    if (!this.apiKey) {
      logger.warn('TMDB_API_KEY não configurada. Algumas funcionalidades podem não funcionar.')
    }
    this.genreCache = { movie: null, tv: null }
  }

  async _request(endpoint, params, operation) {
    if (!this.apiKey) {
      throw new Error('TMDB API Key não configurada')
    }
    try {
      const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
        params: { api_key: this.apiKey, language: LANGUAGE, ...params },
      })
      return response.data
    } catch (error) {
      throw toUpstreamError(error, operation)
    }
  }

  async getGenres(type = 'movie') {
    if (this.genreCache[type]) return this.genreCache[type]

    try {
      const endpoint = type === 'movie' ? '/genre/movie/list' : '/genre/tv/list'
      const data = await this._request(endpoint, {}, `genres ${type}`)
      this.genreCache[type] = data.genres.reduce((acc, g) => {
        acc[g.id] = g.name
        return acc
      }, {})
      return this.genreCache[type]
    } catch {
      // Falha em silêncio: search funciona sem nomes de gêneros.
      return {}
    }
  }

  async mapGenreIds(genreIds, type = 'movie') {
    if (!genreIds?.length) return []
    const genres = await this.getGenres(type)
    return genreIds.map(id => genres[id]).filter(Boolean)
  }

  async getGenreIdsFromNames(names, type = 'movie') {
    if (!names?.length) return []
    const genres = await this.getGenres(type)
    const reverse = {}
    for (const [id, name] of Object.entries(genres)) {
      reverse[name.toLowerCase()] = id
    }
    return names.map(n => reverse[n.toLowerCase()]).filter(Boolean)
  }

  async getGenresList(type = 'movie') {
    const genres = await this.getGenres(type)
    return [...Object.values(genres), ...VIRTUAL_GENRE_NAMES].sort()
  }

  _buildSortParam(sortBy, type = 'movie') {
    const dateField = type === 'tv' ? 'first_air_date' : 'primary_release_date'
    const map = {
      date_asc:    `${dateField}.asc`,
      date_desc:   `${dateField}.desc`,
      rating_asc:  'vote_average.asc',
      rating_desc: 'vote_average.desc',
      popularity:  'popularity.desc',
    }
    return map[sortBy] || 'popularity.desc'
  }

  async discover(type = 'movie', {
    page = 1,
    sortBy = 'popularity',
    genres = [],
    providers = [],
    monetizationTypes = DEFAULT_MONETIZATION,
  } = {}) {
    const endpoint = type === 'tv' ? '/discover/tv' : '/discover/movie'
    const { realGenres, extraTmdbGenreIds, tmdbOriginCountries } = extractVirtualGenres(genres)
    const realGenreIds = await this.getGenreIdsFromNames(realGenres, type)
    const allGenreIds  = [...realGenreIds, ...extraTmdbGenreIds]

    const params = {
      page,
      sort_by: this._buildSortParam(sortBy, type),
      include_adult: false,
    }
    if (allGenreIds.length)         params.with_genres          = allGenreIds.join(',')
    if (tmdbOriginCountries.length) params.with_origin_country  = tmdbOriginCountries.join(',')
    // Sort por nota com piso de votos — evita "10.0 com 1 voto" no topo.
    if (sortBy === 'rating_desc' || sortBy === 'rating_asc') params['vote_count.gte'] = 200
    // Pipe (`|`) = OR no TMDB — item disponível em qualquer um dos providers selecionados.
    if (providers.length) {
      params.with_watch_providers          = providers.join('|')
      params.watch_region                  = WATCH_REGION
      params.with_watch_monetization_types = monetizationTypes.join('|')
    }

    const data    = await this._request(endpoint, params, 'discover do TMDB')
    const results = await this.formatResults(data.results, type)
    return paginated(data, results)
  }

  async search(query, type = 'multi', page = 1) {
    const endpoint = type === 'movie' ? '/search/movie'
                   : type === 'tv'    ? '/search/tv'
                                      : '/search/multi'
    const data    = await this._request(endpoint, { query, page, include_adult: false }, 'buscar no TMDB')
    const results = await this.formatResults(data.results, type)
    return paginated(data, results)
  }

  async _getPopular(type, page = 1) {
    const endpoint = `/${type}/popular`
    const data     = await this._request(endpoint, { page, include_adult: false }, `populares ${type}`)
    const results  = await this.formatResults(data.results, type)
    return paginated(data, results)
  }

  getPopularMovies(page = 1) { return this._getPopular('movie', page) }
  getPopularSeries(page = 1) { return this._getPopular('tv',    page) }

  async _getDetails(type, id) {
    const data = await this._request(`/${type}/${id}`, {
      append_to_response: 'videos,credits,watch/providers,release_dates,content_ratings',
    }, `detalhes ${type}`)
    return type === 'movie' ? this.formatMovieDetails(data) : this.formatSeriesDetails(data)
  }

  getMovieDetails(id)  { return this._getDetails('movie', id) }
  getSeriesDetails(id) { return this._getDetails('tv',    id) }

  async formatResults(results, type) {
    const isMulti = type !== 'movie' && type !== 'tv'

    // Pré-busca os dois caches quando multi (cada item pode ser movie OU tv);
    // pra type fixo basta o cache do próprio type.
    const [movieGenres, tvGenres] = isMulti
      ? await Promise.all([this.getGenres('movie'), this.getGenres('tv')])
      : type === 'tv'
        ? [null, await this.getGenres('tv')]
        : [await this.getGenres('movie'), null]

    return results.map((item) => {
      const itemType = type === 'movie' ? 'MOVIE'
                     : type === 'tv'    ? 'SERIES'
                     : item.media_type === 'movie' ? 'MOVIE' : 'SERIES'
      const genreMap   = itemType === 'MOVIE' ? movieGenres : tvGenres
      const genreNames = (item.genre_ids || []).map(id => genreMap?.[id]).filter(Boolean)

      return {
        id: item.id,
        title: item.title || item.name,
        type: itemType,
        description: item.overview,
        descriptionLanguage: LANGUAGE,
        poster: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
        year: yearFromDate(item.release_date || item.first_air_date),
        rating: roundRating(item.vote_average),
        genres: genreNames,
        externalId: item.id.toString(),
        source: 'TMDB',
      }
    })
  }

  _formatAgeRating(data) {
    const region = CERTIFICATION_REGION

    const movieEntry = data.release_dates?.results?.find(r => r.iso_3166_1 === region)
    if (movieEntry) {
      const cert = movieEntry.release_dates?.find(d => d.certification)?.certification
      if (cert) return { region, value: cert }
    }

    const tvEntry = data.content_ratings?.results?.find(r => r.iso_3166_1 === region)
    if (tvEntry?.rating) return { region, value: tvEntry.rating }

    return null
  }

  // Tiers "with Ads" compartilham catálogo com a versão principal — mantém só uma.
  _dedupeProviders(list) {
    const stripAds = (name) => String(name || '').replace(/\s*(standard\s+)?with\s+ads\s*$/i, '').trim()
    const isAd     = (name) => /with\s+ads\s*$/i.test(name || '')

    const byKey = new Map()
    for (const p of list || []) {
      const key       = stripAds(p.provider_name).toLowerCase()
      const adVariant = isAd(p.provider_name)
      const existing  = byKey.get(key)
      if (!existing || (existing._ad && !adVariant)) {
        byKey.set(key, { ...p, _ad: adVariant })
      }
    }
    return [...byKey.values()].map(({ _ad, ...rest }) => rest)
  }

  _formatWatchProviders(rawWatch) {
    const region = rawWatch?.results?.[WATCH_REGION]
    if (!region) return null

    const mapItem = (p) => ({
      id:   p.provider_id,
      name: p.provider_name,
      logo: p.logo_path ? `${TMDB_LOGO_BASE_URL}${p.logo_path}` : null,
    })

    const streaming = this._dedupeProviders(region.flatrate).map(mapItem)
    const free      = this._dedupeProviders([...(region.free || []), ...(region.ads || [])]).map(mapItem)
    const rent      = this._dedupeProviders(region.rent).map(mapItem)
    const buy       = this._dedupeProviders(region.buy).map(mapItem)

    if (streaming.length + free.length + rent.length + buy.length === 0) return null

    return {
      region: WATCH_REGION,
      link:   region.link || null,
      streaming,
      free,
      rent,
      buy,
    }
  }

  _baseDetails(data) {
    return {
      id: data.id,
      description: data.overview,
      descriptionLanguage: LANGUAGE,
      poster: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : null,
      backdrop: data.backdrop_path ? `${TMDB_BACKDROP_BASE_URL}${data.backdrop_path}` : null,
      genres: data.genres?.map(g => g.name) || [],
      rating: roundRating(data.vote_average),
      externalId: data.id.toString(),
      source: 'TMDB',
      cast: castNames(data.credits),
      trailer: trailerKey(data.videos),
      watchProviders: this._formatWatchProviders(data['watch/providers']),
      ageRating: this._formatAgeRating(data),
    }
  }

  formatMovieDetails(data) {
    return {
      ...this._baseDetails(data),
      title: data.title,
      type: 'MOVIE',
      year: yearFromDate(data.release_date),
      duration: data.runtime,
      director: data.credits?.crew?.find(c => c.job === 'Director')?.name || null,
    }
  }

  formatSeriesDetails(data) {
    // in_production é o único bool cru — status do TMDB já vem traduzido.
    const hasEnded = data.in_production === false
    return {
      ...this._baseDetails(data),
      title: data.name,
      type: 'SERIES',
      year: yearFromDate(data.first_air_date),
      endYear: yearFromDate(data.last_air_date),
      hasEnded,
      duration: data.episode_run_time?.[0] || null,
      seasons: data.number_of_seasons,
      episodes: data.number_of_episodes,
    }
  }
}

export default new TMDBService()
