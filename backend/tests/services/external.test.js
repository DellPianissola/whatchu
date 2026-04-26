/**
 * Testes do serviço de orquestração external.js.
 * Usa vi.mock pra isolar de tmdb.js e jikan.js — sem chamadas HTTP, sem banco.
 * Roda no config padrão (vitest.config.js), não precisa de infra extra.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.mock é hoisted pelo vitest antes dos imports estáticos
vi.mock('../../services/tmdb.js', () => ({
  default: {
    search:           vi.fn(),
    discover:         vi.fn(),
    getGenresList:    vi.fn(),
    getMovieDetails:  vi.fn(),
    getSeriesDetails: vi.fn(),
  },
}))

vi.mock('../../services/jikan.js', () => ({
  default: {
    search:           vi.fn(),
    getPopularAnimes: vi.fn(),
    getGenresList:    vi.fn(),
    getAnimeDetails:  vi.fn(),
  },
}))

import tmdbService  from '../../services/tmdb.js'
import jikanService from '../../services/jikan.js'
import {
  searchByText,
  discoverByType,
  listGenres,
  getDetails,
} from '../../services/external.js'
import { ValidationError } from '../../lib/httpErrors.js'

const tmdbPage  = (results = []) => ({ totalPages: 1, results })
const jikanPage = (results = []) => ({ totalPages: 1, results })

beforeEach(() => vi.clearAllMocks())

// ─── searchByText ───────────────────────────────────────────────────────────

describe('searchByText', () => {
  it('lança ValidationError quando q está ausente', async () => {
    await expect(searchByText({ q: '' })).rejects.toThrow(ValidationError)
  })

  it('roteia para jikan quando type=anime', async () => {
    jikanService.search.mockResolvedValue(jikanPage([{ id: 1 }]))
    const result = await searchByText({ q: 'naruto', type: 'anime', page: 2 })
    expect(jikanService.search).toHaveBeenCalledWith('naruto', 2, expect.any(Object))
    expect(result.type).toBe('anime')
    expect(result.page).toBe(2)
  })

  it('roteia para tmdb /search/movie e ignora sortBy/genres quando type=movie', async () => {
    tmdbService.search.mockResolvedValue(tmdbPage([{ id: 99 }]))
    const result = await searchByText({ q: 'avengers', type: 'movie', sortBy: 'date_desc', genres: 'Action' })
    // TMDB /search não suporta sortBy/genres — recebe só q, type, page
    expect(tmdbService.search).toHaveBeenCalledWith('avengers', 'movie', 1)
    expect(result.type).toBe('movie')
  })

  it('roteia para tmdb /search/tv quando type=series', async () => {
    tmdbService.search.mockResolvedValue(tmdbPage())
    await searchByText({ q: 'breaking', type: 'series' })
    expect(tmdbService.search).toHaveBeenCalledWith('breaking', 'tv', 1)
  })

  it('combina tmdb multi + jikan quando type não é informado', async () => {
    tmdbService.search.mockResolvedValue(tmdbPage([{ id: 1, title: 'TMDB' }]))
    jikanService.search.mockResolvedValue(jikanPage([{ id: 2, title: 'Jikan' }]))
    const result = await searchByText({ q: 'dragon' })
    expect(result.type).toBe('all')
    expect(result.results).toHaveLength(2)
  })

  it('retorna resultados parciais quando um provider falha na busca multi', async () => {
    tmdbService.search.mockRejectedValue(new Error('TMDB offline'))
    jikanService.search.mockResolvedValue(jikanPage([{ id: 5 }]))
    const result = await searchByText({ q: 'test' })
    expect(result.results).toHaveLength(1) // só jikan
  })
})

// ─── discoverByType ─────────────────────────────────────────────────────────

describe('discoverByType', () => {
  it('chama jikan.getPopularAnimes para type=anime', async () => {
    jikanService.getPopularAnimes.mockResolvedValue(jikanPage())
    await discoverByType('anime', { page: 1 })
    expect(jikanService.getPopularAnimes).toHaveBeenCalled()
  })

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
    jikanService.getPopularAnimes.mockResolvedValue(jikanPage())
    await discoverByType('anime', { page: 3, sortBy: 'rating_desc', genres: 'Action,Drama' })
    expect(jikanService.getPopularAnimes).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ sortBy: 'rating_desc', genres: ['Action', 'Drama'] })
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

  it('chama jikan.getGenresList para anime', async () => {
    jikanService.getGenresList.mockResolvedValue([])
    await listGenres('anime')
    expect(jikanService.getGenresList).toHaveBeenCalled()
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

  it('chama jikan.getAnimeDetails para type=anime', async () => {
    jikanService.getAnimeDetails.mockResolvedValue({ id: 3 })
    await getDetails('anime', '789')
    expect(jikanService.getAnimeDetails).toHaveBeenCalledWith('789')
  })
})
