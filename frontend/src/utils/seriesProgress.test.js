import { describe, it, expect } from 'vitest'
import {
  watchableSeasons,
  watchedInSeason,
  airedInSeason,
  percentWatched,
  summarizeProgress,
} from './seriesProgress.js'

const season = (number, episodeCount) => ({ number, episodeCount })

describe('watchableSeasons', () => {
  it('descarta especiais e aceita lista ausente', () => {
    expect(watchableSeasons([season(0, 4), season(1, 10)])).toEqual([season(1, 10)])
    expect(watchableSeasons(undefined)).toEqual([])
  })
})

describe('watchedInSeason', () => {
  it('conta temporada anterior inteira e a do ponteiro até ele', () => {
    const pointer = { season: 2, episode: 3 }
    expect(watchedInSeason(season(1, 10), pointer)).toBe(10)
    expect(watchedInSeason(season(2, 10), pointer)).toBe(3)
    expect(watchedInSeason(season(3, 10), pointer)).toBe(0)
  })

  it('não conta nada sem ponteiro', () => {
    expect(watchedInSeason(season(1, 10), null)).toBe(0)
  })

  it('não passa do tamanho da temporada quando o ponteiro é maior', () => {
    expect(watchedInSeason(season(2, 6), { season: 2, episode: 99 })).toBe(6)
  })
})

describe('airedInSeason', () => {
  const lastAired = { season: 2, episode: 4 }

  it('corta a temporada em exibição no último episódio que saiu', () => {
    expect(airedInSeason(season(1, 10), lastAired)).toBe(10)
    expect(airedInSeason(season(2, 12), lastAired)).toBe(4)
    expect(airedInSeason(season(3, 12), lastAired)).toBe(0)
  })

  it('trata série sem estreia como nada lançado', () => {
    expect(airedInSeason(season(1, 10), null)).toBe(0)
  })
})

describe('percentWatched', () => {
  it('reserva 0% e 100% para os extremos reais', () => {
    expect(percentWatched(0, 48)).toBe(0)
    expect(percentWatched(48, 48)).toBe(100)
  })

  it('nunca arredonda para 100% faltando episódio', () => {
    expect(percentWatched(199, 200)).toBe(99)
  })

  it('nunca arredonda para 0% com episódio assistido', () => {
    expect(percentWatched(1, 150)).toBe(1)
  })

  it('devolve 0 sem total', () => {
    expect(percentWatched(0, 0)).toBe(0)
  })
})

describe('summarizeProgress', () => {
  const seasons = [season(1, 10), season(2, 12)]

  it('ignora não lançados no total', () => {
    const result = summarizeProgress(seasons, { season: 2, episode: 4 }, { season: 2, episode: 6 })

    expect(result).toEqual({ aired: 16, watched: 14, percent: 88 })
  })

  it('chega a 100% estando em dia com o que saiu', () => {
    expect(summarizeProgress(seasons, { season: 2, episode: 6 }, { season: 2, episode: 6 }).percent).toBe(100)
  })

  it('não deixa o assistido passar do lançado quando o ponteiro está adiante', () => {
    const result = summarizeProgress(seasons, { season: 2, episode: 12 }, { season: 1, episode: 10 })

    expect(result).toEqual({ aired: 10, watched: 10, percent: 100 })
  })

  it('zera tudo em série sem estreia', () => {
    expect(summarizeProgress(seasons, null, null)).toEqual({ aired: 0, watched: 0, percent: 0 })
  })
})
