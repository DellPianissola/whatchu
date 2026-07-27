import { describe, it, expect } from 'vitest'
import {
  teamMembers,
  formatDuration,
  displayYear,
  displayRating,
  displayGenres,
  pluralize,
  PRIORITY_OPTIONS,
  PRIORITY_VALUES,
  PRIORITY_LABEL,
} from './content.js'

describe('teamMembers', () => {
  it('sobrevive a details nulo, que é o estado inicial do modal', () => {
    expect(teamMembers(null)).toEqual([])
    expect(teamMembers(undefined)).toEqual([])
    expect(teamMembers({})).toEqual([])
  })

  it('põe o diretor como primeiro membro', () => {
    const result = teamMembers({
      director: 'Greta Gerwig',
      cast: [{ name: 'Margot Robbie', character: 'Barbie' }],
    })

    expect(result).toEqual([
      { name: 'Greta Gerwig',  character: 'Diretor' },
      { name: 'Margot Robbie', character: 'Barbie' },
    ])
  })

  it('não duplica quem dirige e atua', () => {
    const result = teamMembers({
      director: 'Bradley Cooper',
      cast: [
        { name: 'Bradley Cooper', character: 'Leonard Bernstein' },
        { name: 'Carey Mulligan', character: 'Felicia' },
      ],
    })

    expect(result).toEqual([
      { name: 'Bradley Cooper', character: 'Diretor' },
      { name: 'Carey Mulligan', character: 'Felicia' },
    ])
  })

  it('aceita cast antigo em formato de string', () => {
    expect(teamMembers({ cast: ['Ella Bright'] })).toEqual([{ name: 'Ella Bright', character: null }])
  })

  it('devolve só o elenco quando não há diretor, como em séries', () => {
    const cast = [{ name: 'Ella Bright', character: 'Rosie' }]
    expect(teamMembers({ cast })).toEqual(cast)
  })
})

describe('formatDuration', () => {
  it('compõe horas e minutos', () => {
    expect(formatDuration(169)).toBe('2h49min')
  })

  it('omite a parte vazia', () => {
    expect(formatDuration(45)).toBe('45min')
    expect(formatDuration(120)).toBe('2h')
  })

  it('devolve null sem duração', () => {
    expect(formatDuration(0)).toBeNull()
    expect(formatDuration(null)).toBeNull()
  })
})

describe('displayYear', () => {
  it('cai para texto quando não há ano', () => {
    expect(displayYear(2014)).toBe(2014)
    expect(displayYear(null)).toBe('Sem data')
  })
})

describe('displayRating', () => {
  it('fixa uma casa decimal', () => {
    expect(displayRating(8.65)).toBe('8.7')
    expect(displayRating('7')).toBe('7.0')
  })

  it('trata nota ausente e zero como sem nota', () => {
    expect(displayRating(null)).toBe('Sem nota')
    expect(displayRating(0)).toBe('Sem nota')
  })
})

describe('displayGenres', () => {
  it('junta por vírgula e cai para texto quando vazio', () => {
    expect(displayGenres(['Drama', 'Ação'])).toBe('Drama, Ação')
    expect(displayGenres([])).toBe('Sem gênero')
    expect(displayGenres(null)).toBe('Sem gênero')
  })
})

describe('pluralize', () => {
  it('usa o singular só no 1', () => {
    expect(pluralize(1, 'item', 'itens')).toBe('item')
    expect(pluralize(0, 'item', 'itens')).toBe('itens')
    expect(pluralize(2, 'item', 'itens')).toBe('itens')
  })
})

describe('PRIORITY_OPTIONS', () => {
  it('deriva rótulo de cada prioridade, na ordem de PRIORITY_VALUES', () => {
    expect(PRIORITY_OPTIONS.map(o => o.value)).toEqual(PRIORITY_VALUES)
    expect(PRIORITY_OPTIONS.every(o => o.label === PRIORITY_LABEL[o.value])).toBe(true)
  })
})
