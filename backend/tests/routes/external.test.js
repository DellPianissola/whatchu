import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

vi.mock('../../services/external.js', () => ({
  listGenres: vi.fn(),
  searchByText: vi.fn(),
  discoverByType: vi.fn(),
  getDetails: vi.fn(),
}))

vi.mock('../../services/externalLottery.js', () => ({
  luckyDraw: vi.fn(),
}))

import externalRoutes from '../../routes/external.js'
import { errorHandler } from '../../middleware/errorHandler.js'
import * as externalService from '../../services/external.js'
import { luckyDraw } from '../../services/externalLottery.js'

const buildApp = () => {
  const app = express()
  app.use(express.json())
  app.use('/api/external', externalRoutes)
  app.use(errorHandler)
  return app
}

const app = buildApp()

beforeEach(() => vi.clearAllMocks())

describe('rotas públicas de /api/external (sem token)', () => {
  it('GET /genres responde sem autenticação', async () => {
    externalService.listGenres.mockResolvedValue(['Ação', 'Anime'])

    const res = await request(app).get('/api/external/genres?type=movie')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ type: 'movie', genres: ['Ação', 'Anime'] })
  })

  it('POST /lucky responde sem autenticação', async () => {
    luckyDraw.mockResolvedValue({ movie: { id: 1, title: 'Sorteado' } })

    const res = await request(app).post('/api/external/lucky').send({ types: ['MOVIE'] })

    expect(res.status).toBe(200)
    expect(res.body.movie).toMatchObject({ id: 1 })
    expect(luckyDraw).toHaveBeenCalledWith({ types: ['MOVIE'] })
  })

  it('GET /streaming-providers responde sem autenticação', async () => {
    const res = await request(app).get('/api/external/streaming-providers')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.providers)).toBe(true)
  })

  it('GET /movies/:id responde sem autenticação', async () => {
    externalService.getDetails.mockResolvedValue({ id: 1, title: 'Filme' })

    const res = await request(app).get('/api/external/movies/1')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1 })
    expect(externalService.getDetails).toHaveBeenCalledWith('movie', '1')
  })

  it('GET /series/:id responde sem autenticação', async () => {
    externalService.getDetails.mockResolvedValue({ id: 2, title: 'Série' })

    const res = await request(app).get('/api/external/series/2')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 2 })
    expect(externalService.getDetails).toHaveBeenCalledWith('series', '2')
  })
})

describe('rotas protegidas de /api/external (exigem token)', () => {
  it.each([
    ['get', '/api/external/search?q=batman'],
    ['get', '/api/external/movies'],
    ['get', '/api/external/series'],
  ])('%s %s sem token responde 401', async (method, path) => {
    const res = await request(app)[method](path)

    expect(res.status).toBe(401)
  })

  it('não chama o service quando bloqueado por auth', async () => {
    await request(app).get('/api/external/search?q=x')

    expect(externalService.searchByText).not.toHaveBeenCalled()
  })
})
