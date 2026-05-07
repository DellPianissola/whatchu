import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as externalService from '../services/external.js'
import { luckyDraw } from '../services/externalLottery.js'

const router = express.Router()

// GET /api/external/search - Busca textual em todas as APIs
router.get('/search', asyncHandler(async (req, res) => {
  const result = await externalService.searchByText(req.query)
  res.json(result)
}))

// GET /api/external/genres?type=movie|series|anime
router.get('/genres', asyncHandler(async (req, res) => {
  const { type } = req.query
  const genres = await externalService.listGenres(type)
  res.json({ type: type || 'movie', genres })
}))

// POST /api/external/lucky - Sorteia um item popular de fora da lista
// Body: { types?: ('MOVIE'|'SERIES'|'ANIME')[], genres?: string[] }
router.post('/lucky', asyncHandler(async (req, res) => {
  const result = await luckyDraw(req.body || {})
  res.json(result)
}))

// GET /api/external/movies - Lista filmes (discover) com sort/gênero
router.get('/movies', asyncHandler(async (req, res) => {
  const result = await externalService.discoverByType('movie', req.query)
  res.json(result)
}))

// GET /api/external/series - Lista séries (discover) com sort/gênero
router.get('/series', asyncHandler(async (req, res) => {
  const result = await externalService.discoverByType('series', req.query)
  res.json(result)
}))

// GET /api/external/animes - Lista animes com sort/gênero
router.get('/animes', asyncHandler(async (req, res) => {
  const result = await externalService.discoverByType('anime', req.query)
  res.json(result)
}))

// GET /api/external/movies/:id - Detalhes de filme
router.get('/movies/:id', asyncHandler(async (req, res) => {
  res.json(await externalService.getDetails('movie', req.params.id))
}))

// GET /api/external/series/:id - Detalhes de série
router.get('/series/:id', asyncHandler(async (req, res) => {
  res.json(await externalService.getDetails('series', req.params.id))
}))

// GET /api/external/animes/:id - Detalhes de anime
router.get('/animes/:id', asyncHandler(async (req, res) => {
  res.json(await externalService.getDetails('anime', req.params.id))
}))

export default router
