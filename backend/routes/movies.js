import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { movieWriteLimiter } from '../config/rateLimits.js'
import * as moviesService from '../services/movies.js'

const router = express.Router()

// POST /api/movies/draw - Sorteia um filme da lista com peso por prioridade.
// Body opcional: { types?: string[], genres?: string[], priorities?: string[], ignoreWatched?: boolean }
router.post('/draw', asyncHandler(async (req, res) => {
  const movie = await moviesService.drawForUser(req.user.id, req.body || {})
  res.json({ movie })
}))

// GET /api/movies - Lista filmes do usuário autenticado
router.get('/', asyncHandler(async (req, res) => {
  const movies = await moviesService.listMovies(req.user.id, req.query)
  res.json({ movies })
}))

// POST /api/movies - Adiciona novo filme ou série
router.post('/', movieWriteLimiter, asyncHandler(async (req, res) => {
  const movie = await moviesService.createMovie(req.user.id, req.body)
  res.status(201).json({ message: 'Filme adicionado com sucesso', movie })
}))

// GET /api/movies/:id - Busca filme por ID (apenas do usuário autenticado)
router.get('/:id', asyncHandler(async (req, res) => {
  const movie = await moviesService.getMovieById(req.user.id, req.params.id)
  res.json({ movie })
}))

// PUT /api/movies/:id - Atualiza filme (apenas do usuário autenticado)
router.put('/:id', movieWriteLimiter, asyncHandler(async (req, res) => {
  const movie = await moviesService.updateMovie(req.user.id, req.params.id, req.body)
  res.json({ message: 'Filme atualizado com sucesso', movie })
}))

// DELETE /api/movies/:id - Remove filme (apenas do usuário autenticado)
router.delete('/:id', movieWriteLimiter, asyncHandler(async (req, res) => {
  await moviesService.deleteMovie(req.user.id, req.params.id)
  res.json({ message: 'Filme removido com sucesso' })
}))

export default router
