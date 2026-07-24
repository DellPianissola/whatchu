import { describe, it, expect } from 'vitest'
import {
  WATCHED_VALUES, WATCHED_NONE, parseWatchedParam, encodeWatched, matchesWatched,
} from './watchedFilter.js'

describe('parseWatchedParam', () => {
  it('trata param ausente como ambos ligados', () => {
    expect(parseWatchedParam(null)).toEqual(WATCHED_VALUES)
    expect(parseWatchedParam('')).toEqual(WATCHED_VALUES)
  })

  it('isola um único status', () => {
    expect(parseWatchedParam('true')).toEqual(['true'])
    expect(parseWatchedParam('false')).toEqual(['false'])
  })

  it('trata "none" como nenhum ligado', () => {
    expect(parseWatchedParam(WATCHED_NONE)).toEqual([])
  })

  it('cai no default com valor inválido na URL', () => {
    expect(parseWatchedParam('xyz')).toEqual(WATCHED_VALUES)
  })
})

describe('encodeWatched', () => {
  it('omite o param quando ambos estão ligados', () => {
    expect(encodeWatched(WATCHED_VALUES)).toBe('')
  })

  it('usa o próprio valor quando só um está ligado', () => {
    expect(encodeWatched(['true'])).toBe('true')
  })

  it('usa "none" quando nenhum está ligado', () => {
    expect(encodeWatched([])).toBe(WATCHED_NONE)
  })
})

describe('round-trip param → lista → param', () => {
  it.each(['', 'true', 'false', WATCHED_NONE])('preserva %j', (param) => {
    expect(encodeWatched(parseWatchedParam(param))).toBe(param)
  })
})

describe('matchesWatched', () => {
  // watched só é populado quando o item é marcado — undefined/null contam como não assistido.
  it.each([undefined, null, false])('trata %j como não assistido', (watched) => {
    expect(matchesWatched({ watched }, ['false'])).toBe(true)
    expect(matchesWatched({ watched }, ['true'])).toBe(false)
  })

  it('reconhece item assistido', () => {
    expect(matchesWatched({ watched: true }, ['true'])).toBe(true)
    expect(matchesWatched({ watched: true }, ['false'])).toBe(false)
  })

  it('nenhum status ligado não deixa nada passar', () => {
    expect(matchesWatched({ watched: true }, [])).toBe(false)
    expect(matchesWatched({ watched: false }, [])).toBe(false)
  })
})
