import { describe, it, expect } from 'vitest'
import tmdbService from '../../services/tmdb.js'

const seriesPayload = (overrides = {}) => ({
  id: 1399,
  name: 'Série',
  first_air_date: '2011-04-17',
  seasons: [
    { season_number: 0, episode_count: 4,  air_date: '2011-01-01' },
    { season_number: 2, episode_count: 10, air_date: '2012-04-01' },
    { season_number: 1, episode_count: 10, air_date: '2011-04-17' },
    { season_number: 3, episode_count: 0,  air_date: null },
  ],
  ...overrides,
})

describe('formatSeriesDetails', () => {
  it('normaliza e ordena as temporadas por número', () => {
    const { seasonList } = tmdbService.formatSeriesDetails(seriesPayload())

    expect(seasonList).toEqual([
      { number: 0, episodeCount: 4,  airDate: '2011-01-01' },
      { number: 1, episodeCount: 10, airDate: '2011-04-17' },
      { number: 2, episodeCount: 10, airDate: '2012-04-01' },
    ])
  })

  it('mantém seasons e episodes como contagem', () => {
    const details = tmdbService.formatSeriesDetails(seriesPayload({
      number_of_seasons: 2,
      number_of_episodes: 20,
    }))

    expect(details.seasons).toBe(2)
    expect(details.episodes).toBe(20)
  })

  it('expõe o último episódio exibido', () => {
    const details = tmdbService.formatSeriesDetails(seriesPayload({
      last_episode_to_air: { season_number: 2, episode_number: 7 },
    }))

    expect(details.lastAired).toEqual({ season: 2, episode: 7 })
  })

  it('devolve lastAired nulo e seasonList vazia quando o TMDB não manda os campos', () => {
    const details = tmdbService.formatSeriesDetails({ id: 1, name: 'Série' })

    expect(details.lastAired).toBeNull()
    expect(details.seasonList).toEqual([])
  })
})
