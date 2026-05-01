import axios from 'axios'
import { describeAxiosError, makeUpstreamErrorFactory } from '../lib/upstreamErrors.js'

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4'
const toUpstreamError = makeUpstreamErrorFactory('JIKAN')

class JikanService {
  constructor() {
    this._genreCache = null
  }

  /**
   * Carrega e cacheia os gêneros do Jikan (mapa nome → mal_id)
   */
  async _loadGenres() {
    if (this._genreCache) return this._genreCache
    try {
      const response = await axios.get(`${JIKAN_BASE_URL}/genres/anime`)
      this._genreCache = {}
      for (const g of response.data.data) {
        this._genreCache[g.name.toLowerCase()] = g.mal_id
      }
      return this._genreCache
    } catch (error) {
      console.error('Erro ao carregar gêneros do Jikan:', describeAxiosError(error))
      return {}
    }
  }

  async getGenreIdsFromNames(names) {
    if (!names || names.length === 0) return []
    const map = await this._loadGenres()
    return names.map(n => map[n.toLowerCase()]).filter(Boolean)
  }

  async getGenresList() {
    const map = await this._loadGenres()
    return Object.keys(map).map(k => k.replace(/\b\w/g, c => c.toUpperCase())).sort()
  }

  _buildSortParam(sortBy) {
    const map = {
      date_asc: { order_by: 'start_date', sort: 'asc' },
      date_desc: { order_by: 'start_date', sort: 'desc' },
      rating_asc: { order_by: 'score', sort: 'asc' },
      rating_desc: { order_by: 'score', sort: 'desc' },
      popularity: { order_by: 'popularity', sort: 'asc' }, // popularity é rank: menor = mais popular
    }
    return map[sortBy] || { order_by: 'popularity', sort: 'asc' }
  }

  async _queryAnime({ q = '', page = 1, sortBy = 'popularity', genres = [] } = {}) {
    const { order_by, sort } = this._buildSortParam(sortBy)
    const genreIds = await this.getGenreIdsFromNames(genres)

    const params = {
      page,
      limit: 20,
      order_by,
      sort,
      sfw: true,
    }

    if (q && q.trim()) params.q = q
    if (genreIds.length > 0) params.genres = genreIds.join(',')
    if (sortBy === 'rating_desc' || sortBy === 'rating_asc') params.min_score = 1

    const response = await axios.get(`${JIKAN_BASE_URL}/anime`, { params })

    return {
      results: this.formatResults(response.data.data),
      totalPages: response.data.pagination?.last_visible_page || 1,
    }
  }

  async search(query, page = 1, opts = {}) {
    try {
      return await this._queryAnime({ q: query, page, ...opts })
    } catch (error) {
      console.error('Erro ao buscar no Jikan:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar no Jikan')
    }
  }

  async getPopularAnimes(page = 1, opts = {}) {
    try {
      return await this._queryAnime({ page, ...opts })
    } catch (error) {
      console.error('Erro ao buscar animes populares:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar animes populares')
    }
  }

  async getAnimeDetails(id) {
    try {
      const response = await axios.get(`${JIKAN_BASE_URL}/anime/${id}/full`)

      return this.formatAnimeDetails(response.data.data)
    } catch (error) {
      console.error('Erro ao buscar detalhes do anime:', describeAxiosError(error))
      throw toUpstreamError(error, 'buscar detalhes do anime')
    }
  }

  formatResults(results) {
    return results.map(item => ({
      id: item.mal_id,
      title: item.title,
      type: 'ANIME',
      description: item.synopsis,
      descriptionLanguage: 'en', // Jikan API não suporta português, sempre retorna em inglês
      poster: item.images?.jpg?.image_url || null,
      year: item.year || null,
      duration: item.duration ? this.parseDuration(item.duration) : null,
      genres: item.genres?.map(g => g.name) || [],
      rating: item.score ? parseFloat(item.score.toFixed(1)) : null,
      externalId: item.mal_id.toString(),
      source: 'JIKAN',
      episodes: item.episodes || null,
      status: item.status,
    }))
  }

  formatAnimeDetails(data) {
    return {
      id: data.mal_id,
      title: data.title,
      type: 'ANIME',
      description: data.synopsis,
      descriptionLanguage: 'en', // Jikan API não suporta português, sempre retorna em inglês
      poster: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || null,
      year: data.year || null,
      duration: data.duration ? this.parseDuration(data.duration) : null,
      genres: data.genres?.map(g => g.name) || [],
      rating: data.score ? parseFloat(data.score.toFixed(1)) : null,
      externalId: data.mal_id.toString(),
      source: 'JIKAN',
      episodes: data.episodes || null,
      status: data.status,
      studios: data.studios?.map(s => s.name) || [],
      producers: data.producers?.map(p => p.name) || [],
      trailer: data.trailer?.url || null,
    }
  }

  parseDuration(duration) {
    const match = duration.match(/(\d+)\s*min/)
    return match ? parseInt(match[1]) : null
  }
}

export default new JikanService()

