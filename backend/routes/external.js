import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { publicApiLimiter } from '../config/rateLimits.js'
import * as externalService from '../services/external.js'
import { luckyDraw } from '../services/externalLottery.js'
import { publicStreamingProviders } from '../lib/streamingProviders.js'

const router = express.Router()

// GET /api/external/genres?type=movie|series
router.get('/genres', publicApiLimiter, asyncHandler(async (req, res) => {
  const { type } = req.query
  const genres = await externalService.listGenres(type)
  res.json({ type: type || 'movie', genres })
}))

// POST /api/external/lucky - Sorteia um item popular de fora da lista
// Body: { types?: ('MOVIE'|'SERIES')[], genres?: string[], providers?: string[] }
router.post('/lucky', publicApiLimiter, asyncHandler(async (req, res) => {
  const result = await luckyDraw(req.body || {})
  res.json(result)
}))

// GET /api/external/streaming-providers - Lista curada de streamings pro filtro do sorteio
router.get('/streaming-providers', publicApiLimiter, asyncHandler(async (_req, res) => {
  res.json({ providers: publicStreamingProviders() })
}))

// GET /api/external/search - Busca textual no TMDB
router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
  const result = await externalService.searchByText(req.query)
  res.json(result)
}))

// GET /api/external/movies - Lista filmes (discover) com sort/gênero
router.get('/movies', authenticateToken, asyncHandler(async (req, res) => {
  const result = await externalService.discoverByType('movie', req.query)
  res.json(result)
}))

// GET /api/external/series - Lista séries (discover) com sort/gênero
router.get('/series', authenticateToken, asyncHandler(async (req, res) => {
  const result = await externalService.discoverByType('series', req.query)
  res.json(result)
}))

// GET /api/external/movies/:id - Detalhes de filme (dados públicos do TMDB)
router.get('/movies/:id', publicApiLimiter, asyncHandler(async (req, res) => {
  res.json(await externalService.getDetails('movie', req.params.id))
}))

// GET /api/external/series/:id - Detalhes de série (dados públicos do TMDB)
router.get('/series/:id', publicApiLimiter, asyncHandler(async (req, res) => {
  res.json(await externalService.getDetails('series', req.params.id))
}))

export default router
