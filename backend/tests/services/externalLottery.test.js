import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../services/tmdb.js', () => ({
  default: {
    discover: vi.fn(),
  },
}))

vi.mock('../../services/jikan.js', () => ({
  default: {
    getPopularAnimes: vi.fn(),
  },
}))

import tmdbService  from '../../services/tmdb.js'
import jikanService from '../../services/jikan.js'
import { luckyDraw, weightByRating } from '../../services/externalLottery.js'
import { ValidationError } from '../../lib/httpErrors.js'

const tmdbPage  = (results = []) => ({ totalPages: 20, results })
const jikanPage = (results = []) => ({ totalPages: 20, results })

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
    jikanService.getPopularAnimes.mockResolvedValue(jikanPage([mkItem({ type: 'ANIME' })]))

    await luckyDraw({})

    expect(tmdbService.discover).toHaveBeenCalledWith('movie', expect.any(Object))
    expect(tmdbService.discover).toHaveBeenCalledWith('tv', expect.any(Object))
    expect(jikanService.getPopularAnimes).toHaveBeenCalled()
  })

  it('passa gêneros pros providers', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage([mkItem()]))
    jikanService.getPopularAnimes.mockResolvedValue(jikanPage([]))

    await luckyDraw({ types: ['MOVIE', 'ANIME'], genres: ['Ação', 'Drama'] })

    expect(tmdbService.discover).toHaveBeenCalledWith(
      'movie',
      expect.objectContaining({ genres: ['Ação', 'Drama'], sortBy: 'popularity' })
    )
    expect(jikanService.getPopularAnimes).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ genres: ['Ação', 'Drama'], sortBy: 'popularity' })
    )
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
    jikanService.getPopularAnimes.mockResolvedValue(jikanPage([]))

    const result = await luckyDraw({})

    expect(result.movie).toBeNull()
    expect(result.reason).toBe('NO_RESULTS')
  })

  it('falha de um provider não derruba o sorteio', async () => {
    const anime = mkItem({ id: 9, type: 'ANIME', title: 'Anime' })
    tmdbService.discover.mockRejectedValue(new Error('TMDB down'))
    jikanService.getPopularAnimes.mockResolvedValue(jikanPage([anime]))

    const result = await luckyDraw({ types: ['MOVIE', 'ANIME'] })

    expect(result.movie).toEqual(anime)
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
    // Nota 9 (peso 17) vs nota 5 (peso 1) → 17/18 ≈ 94%. Limiar 80% pra não flakear.
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

    await luckyDraw({ types: ['MOVIE', 'GARBAGE'] })

    expect(tmdbService.discover).toHaveBeenCalledWith('movie', expect.any(Object))
    expect(tmdbService.discover).not.toHaveBeenCalledWith('tv', expect.any(Object))
    expect(jikanService.getPopularAnimes).not.toHaveBeenCalled()
  })
})
