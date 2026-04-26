import express from 'express'
import tmdbService from '../services/tmdb.js'
import jikanService from '../services/jikan.js'

const router = express.Router()

// GET /api/external/search - Busca em todas as APIs
router.get('/search', async (req, res) => {
  try {
    const { q, type, page = 1 } = req.query

    if (!q) {
      return res.status(400).json({ error: 'Parâmetro "q" (query) é obrigatório' })
    }

    let results = []
    let totalPages = 1

    if (type === 'anime') {
      const jikanData = await jikanService.search(q, page)
      results = jikanData.results
      totalPages = jikanData.totalPages
    } else if (type === 'movie') {
      const tmdbData = await tmdbService.search(q, 'movie', page)
      results = tmdbData.results
      totalPages = tmdbData.totalPages
    } else if (type === 'series') {
      const tmdbData = await tmdbService.search(q, 'tv', page)
      results = tmdbData.results
      totalPages = tmdbData.totalPages
    } else {
      // sem type: busca multi no TMDB + Jikan
      try {
        const tmdbData = await tmdbService.search(q, 'multi', page)
        results = [...results, ...tmdbData.results]
        totalPages = tmdbData.totalPages
      } catch (error) {
        console.error('Erro ao buscar no TMDB:', error.message)
      }
      try {
        const jikanData = await jikanService.search(q, page)
        results = [...results, ...jikanData.results]
      } catch (error) {
        console.error('Erro ao buscar no Jikan:', error.message)
      }
    }

    res.json({
      query: q,
      type: type || 'all',
      page: parseInt(page),
      totalPages,
      results,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/external/movies - Busca filmes populares
router.get('/movies', async (req, res) => {
  try {
    const { page = 1 } = req.query
    const { results, totalPages } = await tmdbService.getPopularMovies(page)
    res.json({
      page: parseInt(page),
      totalPages,
      results,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/external/series - Busca séries populares
router.get('/series', async (req, res) => {
  try {
    const { page = 1 } = req.query
    const { results, totalPages } = await tmdbService.getPopularSeries(page)
    res.json({
      page: parseInt(page),
      totalPages,
      results,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/external/animes - Busca animes populares
router.get('/animes', async (req, res) => {
  try {
    const { page = 1 } = req.query
    const { results, totalPages } = await jikanService.getPopularAnimes(page)
    res.json({
      page: parseInt(page),
      totalPages,
      results,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/external/movies/:id - Detalhes de filme
router.get('/movies/:id', async (req, res) => {
  try {
    const { id } = req.params
    const movie = await tmdbService.getMovieDetails(id)
    res.json(movie)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/external/series/:id - Detalhes de série
router.get('/series/:id', async (req, res) => {
  try {
    const { id } = req.params
    const series = await tmdbService.getSeriesDetails(id)
    res.json(series)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/external/animes/:id - Detalhes de anime
router.get('/animes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const anime = await jikanService.getAnimeDetails(id)
    res.json(anime)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

