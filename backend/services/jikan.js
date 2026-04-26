import axios from 'axios'

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4'

class JikanService {
  async search(query, page = 1) {
    try {
      const response = await axios.get(`${JIKAN_BASE_URL}/anime`, {
        params: {
          q: query,
          page,
          limit: 20,
        },
      })

      return {
        results: this.formatResults(response.data.data),
        totalPages: response.data.pagination?.last_visible_page || 1,
      }
    } catch (error) {
      console.error('Erro ao buscar no Jikan:', error.message)
      throw new Error(`Erro ao buscar no Jikan: ${error.message}`)
    }
  }

  async getPopularAnimes(page = 1) {
    try {
      const response = await axios.get(`${JIKAN_BASE_URL}/top/anime`, {
        params: {
          page,
          limit: 20,
        },
      })

      return {
        results: this.formatResults(response.data.data),
        totalPages: response.data.pagination?.last_visible_page || 1,
      }
    } catch (error) {
      console.error('Erro ao buscar animes populares:', error.message)
      throw new Error(`Erro ao buscar animes populares: ${error.message}`)
    }
  }

  async getAnimeDetails(id) {
    try {
      const response = await axios.get(`${JIKAN_BASE_URL}/anime/${id}/full`)

      return this.formatAnimeDetails(response.data.data)
    } catch (error) {
      console.error('Erro ao buscar detalhes do anime:', error.message)
      throw new Error(`Erro ao buscar detalhes do anime: ${error.message}`)
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

