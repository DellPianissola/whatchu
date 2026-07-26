import { describe, it, expect } from 'vitest'
import { findUserMovie } from './userMovies.js'

const movie  = { id: 'a', title: 'Fargo', type: 'MOVIE',  externalId: '275' }
const series = { id: 'b', title: 'Fargo', type: 'SERIES', externalId: '275' }

describe('findUserMovie', () => {
  it('casa por externalId dentro do mesmo type', () => {
    expect(findUserMovie([movie, series], { type: 'SERIES', externalId: '275' })).toBe(series)
    expect(findUserMovie([movie, series], { type: 'MOVIE',  externalId: '275' })).toBe(movie)
  })

  it('não casa quando o externalId bate mas o type não', () => {
    expect(findUserMovie([movie], { type: 'SERIES', externalId: '275', title: 'Fargo' })).toBeNull()
  })

  it('cai pro título quando não há externalId', () => {
    expect(findUserMovie([movie, series], { type: 'SERIES', title: 'Fargo' })).toBe(series)
  })

  it('aceita type minúsculo vindo do TMDB', () => {
    expect(findUserMovie([series], { type: 'series', externalId: '275' })).toBe(series)
  })

  it('devolve null para item ausente', () => {
    expect(findUserMovie([movie], null)).toBeNull()
  })
})
