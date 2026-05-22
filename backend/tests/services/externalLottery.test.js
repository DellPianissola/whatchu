import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../services/tmdb.js', () => ({
  default: {
    discover: vi.fn(),
  },
}))

import tmdbService from '../../services/tmdb.js'
import { luckyDraw, weightByRating } from '../../services/externalLottery.js'
import { ValidationError } from '../../lib/httpErrors.js'

const tmdbPage = (results = []) => ({ totalPages: 20, results })

const mkItem = (overrides = {}) => ({
  id: 1,
  title: 'Item',
  type: 'MOVIE',
  rating: 7,
  externalId: '1',
  ...overrides,
})

beforeEach(() => vi.clearAllMocks())

// ─── weightByRating ─────────────────────────────────────────────────────────

describe('weightByRating', () => {
  it('peso base 1 quando não tem nota', () => {
    expect(weightByRating({ rating: null })).toBe(1)
    expect(weightByRating({})).toBe(1)
  })

  it('peso base 1 quando nota ≤ 5', () => {
    expect(weightByRating({ rating: 5 })).toBe(1)
    expect(weightByRating({ rating: 3.4 })).toBe(1)
  })

  it('cresce quadraticamente acima de 5', () => {
    expect(weightByRating({ rating: 6 })).toBe(2)
    expect(weightByRating({ rating: 7 })).toBe(5)
    expect(weightByRating({ rating: 8 })).toBe(10)
    expect(weightByRating({ rating: 9 })).toBe(17)
    expect(weightByRating({ rating: 10 })).toBe(26)
  })
})

describe('luckyDraw', () => {
  it('lança ValidationError quando não há nenhum tipo válido', async () => {
    await expect(luckyDraw({ types: ['INVALID'] })).rejects.toThrow(ValidationError)
  })

  it('quando types vazio/undefined, busca todos os tipos', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([mkItem()]))

    await luckyDraw({})

    expect(tmdbService.discover).toHaveBeenCalledWith('movie', expect.any(Object))
    expect(tmdbService.discover).toHaveBeenCalledWith('tv', expect.any(Object))
  })

  it('passa gêneros pros providers', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([mkItem()]))

    await luckyDraw({ types: ['MOVIE', 'SERIES'], genres: ['Ação', 'Drama'] })

    expect(tmdbService.discover).toHaveBeenCalledWith(
      'movie',
      expect.objectContaining({ genres: ['Ação', 'Drama'], sortBy: 'popularity' })
    )
    expect(tmdbService.discover).toHaveBeenCalledWith(
      'tv',
      expect.objectContaining({ genres: ['Ação', 'Drama'], sortBy: 'popularity' })
    )
  })

  it('resolve provider keys pra tmdbIds e passa pro discover', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([mkItem()]))

    await luckyDraw({ types: ['MOVIE'], providers: ['netflix', 'prime'] })

    const [, opts] = tmdbService.discover.mock.calls[0]
    expect(opts.providers).toEqual([8, 1796, 9, 10, 119, 2100])
  })

  it('providers vazio chega como [] no discover (sem with_watch_providers)', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([mkItem()]))

    await luckyDraw({ types: ['MOVIE'] })

    expect(tmdbService.discover).toHaveBeenCalledWith(
      'movie',
      expect.objectContaining({ providers: [] })
    )
  })

  it('provider key inválida é filtrada silenciosamente', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([mkItem()]))

    await luckyDraw({ types: ['MOVIE'], providers: ['netflix', 'fake-streaming'] })

    const [, opts] = tmdbService.discover.mock.calls[0]
    expect(opts.providers).toEqual([8, 1796])
  })

  it('devolve um item quando há candidatos', async () => {
    const movie = mkItem({ id: 42, title: 'Sorteado' })
    tmdbService.discover.mockResolvedValue(tmdbPage([movie]))

    const result = await luckyDraw({ types: ['MOVIE'] })

    expect(result.movie).toEqual(movie)
    expect(result.reason).toBeUndefined()
  })

  it('devolve NO_RESULTS quando todos os providers vêm vazios', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([]))

    const result = await luckyDraw({})

    expect(result.movie).toBeNull()
    expect(result.reason).toBe('NO_RESULTS')
  })

  it('falha de um provider não derruba o sorteio', async () => {
    const series = mkItem({ id: 9, type: 'SERIES', title: 'Série' })
    tmdbService.discover.mockImplementation((type) => {
      if (type === 'movie') return Promise.reject(new Error('TMDB movie down'))
      return Promise.resolve(tmdbPage([series]))
    })

    const result = await luckyDraw({ types: ['MOVIE', 'SERIES'] })

    expect(result.movie).toEqual(series)
  })

  it('quando página aleatória vem vazia, refaz na página 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95)
    tmdbService.discover
      .mockResolvedValueOnce(tmdbPage([]))
      .mockResolvedValueOnce(tmdbPage([mkItem({ id: 7 })]))

    const result = await luckyDraw({ types: ['MOVIE'] })

    expect(tmdbService.discover).toHaveBeenCalledTimes(2)
    expect(tmdbService.discover.mock.calls[1][1]).toMatchObject({ page: 1 })
    expect(result.movie).toEqual(expect.objectContaining({ id: 7 }))

    vi.restoreAllMocks()
  })

  it('peso por nota faz item bem avaliado vencer maioria dos sorteios', async () => {
    const winner = mkItem({ id: 1, rating: 9, title: 'Bom' })
    const loser  = mkItem({ id: 2, rating: 5, title: 'Médio' })
    tmdbService.discover.mockResolvedValue(tmdbPage([winner, loser]))

    let wins = 0
    const N = 200
    for (let i = 0; i < N; i++) {
      const { movie } = await luckyDraw({ types: ['MOVIE'] })
      if (movie.id === winner.id) wins++
    }
    expect(wins / N).toBeGreaterThan(0.8)
  })

  it('ignora tipos inválidos no input mas mantém os válidos', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([mkItem()]))

    await luckyDraw({ types: ['MOVIE', 'GARBAGE', 'WHATEVER'] })

    expect(tmdbService.discover).toHaveBeenCalledWith('movie', expect.any(Object))
    expect(tmdbService.discover).not.toHaveBeenCalledWith('tv', expect.any(Object))
  })
})
