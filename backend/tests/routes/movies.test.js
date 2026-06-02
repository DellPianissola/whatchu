import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

vi.mock('../../services/movies.js', () => ({
  drawForUser: vi.fn(),
  listMovies: vi.fn(),
  createMovie: vi.fn(),
  getMovieById: vi.fn(),
  updateMovie: vi.fn(),
  deleteMovie: vi.fn(),
}))

import moviesRoutes from '../../routes/movies.js'
import { errorHandler } from '../../middleware/errorHandler.js'
import * as moviesService from '../../services/movies.js'

const buildApp = (userId) => {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => { req.user = { id: userId }; next() })
  app.use('/api/movies', moviesRoutes)
  app.use(errorHandler)
  return app
}

beforeEach(() => vi.clearAllMocks())

describe('rate limit de escrita em /api/movies', () => {
  it('bloqueia com 429 após exceder o limite por usuário', async () => {
    moviesService.createMovie.mockResolvedValue({ id: 1, title: 'X' })
    const app = buildApp('rl-user-a')

    let last
    for (let i = 0; i < 60; i++) {
      last = await request(app).post('/api/movies').send({ title: 'X' })
    }
    expect(last.status).toBe(201)

    const blocked = await request(app).post('/api/movies').send({ title: 'X' })
    expect(blocked.status).toBe(429)
  })

  it('isola o limite por usuário (key = user.id)', async () => {
    moviesService.deleteMovie.mockResolvedValue(undefined)
    const app = buildApp('rl-user-b')

    const res = await request(app).delete('/api/movies/1')
    expect(res.status).toBe(200)
  })

  it('não limita leitura da lista (GET /)', async () => {
    moviesService.listMovies.mockResolvedValue([])
    const app = buildApp('rl-user-c')

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/api/movies')
      expect(res.status).toBe(200)
    }
  })
})
