/**
 * Testes do serviço de orquestração external.js.
 * Usa vi.mock pra isolar de tmdb.js — sem chamadas HTTP, sem banco.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../services/tmdb.js', () => ({
  default: {
    search:           vi.fn(),
    discover:         vi.fn(),
    getGenresList:    vi.fn(),
    getMovieDetails:  vi.fn(),
    getSeriesDetails: vi.fn(),
  },
}))

import tmdbService from '../../services/tmdb.js'
import {
  searchByText,
  discoverByType,
  listGenres,
  getDetails,
} from '../../services/external.js'
import { ValidationError } from '../../lib/httpErrors.js'

const tmdbPage = (results = []) => ({ totalPages: 1, results })

beforeEach(() => vi.clearAllMocks())

// ─── searchByText ───────────────────────────────────────────────────────────

describe('searchByText', () => {
  it('lança ValidationError quando q está ausente', async () => {
    await expect(searchByText({ q: '' })).rejects.toThrow(ValidationError)
  })

  it('roteia para tmdb /search/movie quando type=movie', async () => {
    tmdbService.search.mockResolvedValue(tmdbPage([{ id: 99 }]))
    const result = await searchByText({ q: 'avengers', type: 'movie' })
    expect(tmdbService.search).toHaveBeenCalledWith('avengers', 'movie', 1)
    expect(result.type).toBe('movie')
  })

  it('roteia para tmdb /search/tv quando type=series', async () => {
    tmdbService.search.mockResolvedValue(tmdbPage())
    await searchByText({ q: 'breaking', type: 'series' })
    expect(tmdbService.search).toHaveBeenCalledWith('breaking', 'tv', 1)
  })

  it('usa /search/multi quando type não é informado', async () => {
    tmdbService.search.mockResolvedValue(tmdbPage([{ id: 1 }]))
    const result = await searchByText({ q: 'dragon' })
    expect(tmdbService.search).toHaveBeenCalledWith('dragon', 'multi', 1)
    expect(result.type).toBe('all')
  })
})

// ─── discoverByType ─────────────────────────────────────────────────────────

describe('discoverByType', () => {
  it('chama tmdb.discover("tv") para type=series', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage())
    await discoverByType('series', { page: 1 })
    expect(tmdbService.discover).toHaveBeenCalledWith('tv', expect.any(Object))
  })

  it('chama tmdb.discover("movie") para type=movie (e como padrão)', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage())
    await discoverByType('movie', { page: 1 })
    expect(tmdbService.discover).toHaveBeenCalledWith('movie', expect.any(Object))
  })

  it('repassa page, sortBy e genres para o provider', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage())
    await discoverByType('movie', { page: 3, sortBy: 'rating_desc', genres: 'Ação,Drama' })
    expect(tmdbService.discover).toHaveBeenCalledWith(
      'movie',
      expect.objectContaining({ page: 3, sortBy: 'rating_desc', genres: ['Ação', 'Drama'] })
    )
  })

  it('repassa gênero virtual Anime sem tratamento especial no service', async () => {
    tmdbService.discover.mockResolvedValue(tmdbPage())
    await discoverByType('movie', { genres: 'Anime,Ação' })
    expect(tmdbService.discover).toHaveBeenCalledWith(
      'movie',
      expect.objectContaining({ genres: ['Anime', 'Ação'] })
    )
  })
})

// ─── listGenres ─────────────────────────────────────────────────────────────

describe('listGenres', () => {
  it('chama tmdb.getGenresList("tv") para series', async () => {
    tmdbService.getGenresList.mockResolvedValue([])
    await listGenres('series')
    expect(tmdbService.getGenresList).toHaveBeenCalledWith('tv')
  })

  it('chama tmdb.getGenresList("movie") como padrão', async () => {
    tmdbService.getGenresList.mockResolvedValue([])
    await listGenres('movie')
    expect(tmdbService.getGenresList).toHaveBeenCalledWith('movie')
  })
})

// ─── getDetails ─────────────────────────────────────────────────────────────

describe('getDetails', () => {
  it('lança ValidationError para tipo desconhecido', async () => {
    await expect(getDetails('anime', '123')).rejects.toThrow(ValidationError)
    await expect(getDetails('livro', '123')).rejects.toThrow(ValidationError)
  })

  it('chama tmdb.getMovieDetails para type=movie', async () => {
    tmdbService.getMovieDetails.mockResolvedValue({ id: 1 })
    await getDetails('movie', '123')
    expect(tmdbService.getMovieDetails).toHaveBeenCalledWith('123')
  })

  it('chama tmdb.getSeriesDetails para type=series', async () => {
    tmdbService.getSeriesDetails.mockResolvedValue({ id: 2 })
    await getDetails('series', '456')
    expect(tmdbService.getSeriesDetails).toHaveBeenCalledWith('456')
  })
})
