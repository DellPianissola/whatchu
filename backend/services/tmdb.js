import axios from 'axios'
import { describeAxiosError, makeUpstreamErrorFactory } from '../lib/upstreamErrors.js'
import { extractVirtualGenres, VIRTUAL_GENRE_NAMES } from '../lib/virtualGenres.js'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'
const TMDB_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92'

// Watch providers e classificação etária são por região. Whatchu é BR-only por
// enquanto — se um dia virar multi-país, isso passa pra config de perfil.
const WATCH_REGION = 'BR'
const CERTIFICATION_REGION = 'BR'

const toUpstreamError = makeUpstreamErrorFactory('TMDB')

class TMDBService {
  constructor() {
    this.apiKey = process.env.TMDB_API_KEY
    if (!this.apiKey) {
      console.warn('⚠️ TMDB_API_KEY não configurada. Algumas funcionalidades podem não funcionar.')
    }
    this.genreCache = {
      movie: null,
      tv: null,
    }
  }

  async getGenres(type = 'movie') {
    if (this.genreCache[type]) {
      return this.genreCache[type]
    }

    try {
      const endpoint = type === 'movie' ? '/genre/movie/list' : '/genre/tv/list'
      const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
        params: {
          api_key: this.apiKey,
          language: 'pt-BR',
        },
      })

      this.genreCache[type] = response.data.genres.reduce((acc, genre) => {
        acc[genre.id] = genre.name
        return acc
      }, {})

      return this.genreCache[type]
    } catch (error) {
      // Falha em silêncio: search funciona sem nomes de gêneros.
      console.error('Erro ao buscar gêneros:', describeAxiosError(error))
      return {}
    }
  }

  async mapGenreIds(genreIds, type = 'movie') {
    if (!genreIds || genreIds.length === 0) return []

    const genres = await this.getGenres(type)
    return genreIds.map(id => genres[id]).filter(Boolean)
  }

  async getGenreIdsFromNames(names, type = 'movie') {
    if (!names || names.length === 0) return []
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
      date_asc: `${dateField}.asc`,
      date_desc: `${dateField}.desc`,
      rating_asc: 'vote_average.asc',
      rating_desc: 'vote_average.desc',
      popularity: 'popularity.desc',
    }
    return map[sortBy] || 'popularity.desc'
  }

  async discover(type = 'movie', { page = 1, sortBy = 'popularity', genres = [] } = {}) {
    if (!this.apiKey) {
      throw new Error('TMDB API Key não configurada')
    }

    try {
      const endpoint = type === 'tv' ? '/discover/tv' : '/discover/movie'
      const sort = this._buildSortParam(sortBy, type)
      const { realGenres, extraTmdbGenreIds, tmdbOriginCountries } = extractVirtualGenres(genres)
      const realGenreIds = await this.getGenreIdsFromNames(realGenres, type)
      const allGenreIds = [...realGenreIds, ...extraTmdbGenreIds]

      const params = {
        api_key: this.apiKey,
        language: 'pt-BR',
        page,
        sort_by: sort,
        include_adult: false,
      }

      if (allGenreIds.length > 0) {
        params.with_genres = allGenreIds.join(',')
      }

      if (tmdbOriginCountries.length > 0) {
        params.with_origin_country = tmdbOriginCountries.join(',')
      }

      // Para sort por nota, exigir um mínimo de votos para evitar resultados de 1 usuário com nota 10
      if (sortBy === 'rating_desc' || sortBy === 'rating_asc') {
        params['vote_count.gte'] = 200
      }

      const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, { params })
      const results = await this.formatResults(response.data.results, type)

      return {
        results,
        totalPages: Math.min(response.data.total_pages || 1, 500),
        totalResults: response.data.total_results || 0,
      }
    } catch (error) {
      console.error('Erro no discover do TMDB:', describeAxiosError(error))
      throw toUpstreamError(error, 'discover do TMDB')
    }
  }

  async search(query, type = 'multi', page = 1) {
    if (!this.apiKey) {
      throw new Error('TMDB API Key não configurada')
    }

    try {
      const endpoint = type === 'movie'
        ? '/search/movie'
        : type === 'tv'
        ? '/search/tv'
        : '/search/multi'

      const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
        params: {
          api_key: this.apiKey,
          query,
          page,
          language: 'pt-BR',
          include_adult: false,
        },
      })

      const results = await this.formatResults(response.data.results, type)

      return {
        results,
        totalPages: Math.min(response.data.total_pages || 1, 500),
        totalResults: response.data.total_results || 0,
      }
    } catch (error) {
      console.error('Erro ao buscar no TMDB:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar no TMDB')
    }
  }

  async getPopularMovies(page = 1) {
    if (!this.apiKey) {
      throw new Error('TMDB API Key não configurada')
    }

    try {
      const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
        params: {
          api_key: this.apiKey,
          page,
          language: 'pt-BR',
          include_adult: false,
        },
      })

      const results = await this.formatResults(response.data.results, 'movie')

      return {
        results,
        totalPages: Math.min(response.data.total_pages || 1, 500),
        totalResults: response.data.total_results || 0,
      }
    } catch (error) {
      console.error('Erro ao buscar filmes populares:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar filmes populares')
    }
  }

  async getPopularSeries(page = 1) {
    if (!this.apiKey) {
      throw new Error('TMDB API Key não configurada')
    }

    try {
      const response = await axios.get(`${TMDB_BASE_URL}/tv/popular`, {
        params: {
          api_key: this.apiKey,
          page,
          language: 'pt-BR',
          include_adult: false,
        },
      })

      const results = await this.formatResults(response.data.results, 'tv')

      return {
        results,
        totalPages: Math.min(response.data.total_pages || 1, 500),
        totalResults: response.data.total_results || 0,
      }
    } catch (error) {
      console.error('Erro ao buscar séries populares:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar séries populares')
    }
  }

  async getMovieDetails(id) {
    if (!this.apiKey) {
      throw new Error('TMDB API Key não configurada')
    }

    try {
      const response = await axios.get(`${TMDB_BASE_URL}/movie/${id}`, {
        params: {
          api_key: this.apiKey,
          language: 'pt-BR',
          append_to_response: 'videos,credits,watch/providers,release_dates,content_ratings',
        },
      })

      return this.formatMovieDetails(response.data)
    } catch (error) {
      console.error('Erro ao buscar detalhes do filme:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar detalhes do filme')
    }
  }

  async getSeriesDetails(id) {
    if (!this.apiKey) {
      throw new Error('TMDB API Key não configurada')
    }

    try {
      const response = await axios.get(`${TMDB_BASE_URL}/tv/${id}`, {
        params: {
          api_key: this.apiKey,
          language: 'pt-BR',
          append_to_response: 'videos,credits,watch/providers,release_dates,content_ratings',
        },
      })

      return this.formatSeriesDetails(response.data)
    } catch (error) {
      console.error('Erro ao buscar detalhes da série:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar detalhes da série')
    }
  }

  async formatResults(results, type) {
    const genreType = type === 'movie' ? 'movie' : type === 'tv' ? 'tv' : 'movie'
    const genres = await this.getGenres(genreType)
    
    return Promise.all(results.map(async (item) => {
      const itemType = type === 'movie' ? 'MOVIE' : type === 'tv' ? 'SERIES' : item.media_type === 'movie' ? 'MOVIE' : 'SERIES'
      const itemGenreType = itemType === 'MOVIE' ? 'movie' : 'tv'
      const genreNames = await this.mapGenreIds(item.genre_ids, itemGenreType)
      
      return {
        id: item.id,
        title: item.title || item.name,
        type: itemType,
        description: item.overview,
        descriptionLanguage: 'pt-BR', // TMDB retorna em português quando language=pt-BR
        poster: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
        year: item.release_date ? new Date(item.release_date).getFullYear() : null,
        rating: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : null,
        genres: genreNames,
        externalId: item.id.toString(),
        source: 'TMDB',
      }
    }))
  }

  _formatAgeRating(data) {
    const region = CERTIFICATION_REGION

    // Movie
    const movieEntry = data.release_dates?.results?.find(r => r.iso_3166_1 === region)
    if (movieEntry) {
      const cert = movieEntry.release_dates?.find(d => d.certification)?.certification
      if (cert) return { region, value: cert }
    }

    // TV
    const tvEntry = data.content_ratings?.results?.find(r => r.iso_3166_1 === region)
    if (tvEntry?.rating) return { region, value: tvEntry.rating }

    return null
  }

  _formatWatchProviders(rawWatch) {
    const region = rawWatch?.results?.[WATCH_REGION]
    if (!region) return null

    const mapItem = (p) => ({
      id:   p.provider_id,
      name: p.provider_name,
      logo: p.logo_path ? `${TMDB_LOGO_BASE_URL}${p.logo_path}` : null,
    })

    const streaming = (region.flatrate || []).map(mapItem)
    const free      = [...(region.free || []), ...(region.ads || [])].map(mapItem)
    const rent      = (region.rent || []).map(mapItem)
    const buy       = (region.buy  || []).map(mapItem)

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

  formatMovieDetails(data) {
    return {
      id: data.id,
      title: data.title,
      type: 'MOVIE',
      description: data.overview,
      descriptionLanguage: 'pt-BR', // TMDB retorna em português quando language=pt-BR
      poster: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : null,
      year: data.release_date ? new Date(data.release_date).getFullYear() : null,
      duration: data.runtime,
      genres: data.genres?.map(g => g.name) || [],
      rating: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : null,
      externalId: data.id.toString(),
      source: 'TMDB',
      director: data.credits?.crew?.find(c => c.job === 'Director')?.name || null,
      cast: data.credits?.cast?.slice(0, 5).map(a => a.name) || [],
      trailer: data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key || null,
      watchProviders: this._formatWatchProviders(data['watch/providers']),
      ageRating: this._formatAgeRating(data),
    }
  }

  formatSeriesDetails(data) {
    return {
      id: data.id,
      title: data.name,
      type: 'SERIES',
      description: data.overview,
      descriptionLanguage: 'pt-BR', // TMDB retorna em português quando language=pt-BR
      poster: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : null,
      year: data.first_air_date ? new Date(data.first_air_date).getFullYear() : null,
      duration: data.episode_run_time?.[0] || null,
      genres: data.genres?.map(g => g.name) || [],
      rating: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : null,
      externalId: data.id.toString(),
      source: 'TMDB',
      seasons: data.number_of_seasons,
      episodes: data.number_of_episodes,
      cast: data.credits?.cast?.slice(0, 5).map(a => a.name) || [],
      trailer: data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key || null,
      watchProviders: this._formatWatchProviders(data['watch/providers']),
      ageRating: this._formatAgeRating(data),
    }
  }
}

export default new TMDBService()

