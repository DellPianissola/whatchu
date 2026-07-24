import { describe, it, expect } from 'vitest'
import { splitSort, toggleSortField, buildSortValues, buildSortCategories, getSortIcon } from './sort.jsx'

const FIELDS = [
  { field: 'popularity', label: 'Em alta', directionless: true, sheetLabel: 'Populares primeiro' },
  { field: 'date',   label: 'Data', ascLabel: 'Mais antigos',  descLabel: 'Mais recentes' },
  { field: 'rating', label: 'Nota', ascLabel: 'Menor nota',    descLabel: 'Maior nota'    },
]

describe('splitSort', () => {
  it('separa campo e direção', () => {
    expect(splitSort('added_desc')).toEqual({ field: 'added', dir: 'desc' })
  })

  it('trata campo sem direção', () => {
    expect(splitSort('popularity')).toEqual({ field: 'popularity', dir: null })
  })

  it('trata ausência de valor', () => {
    expect(splitSort(null)).toEqual({ field: null, dir: null })
    expect(splitSort('')).toEqual({ field: null, dir: null })
  })
})

describe('toggleSortField', () => {
  it('entra em desc ao ativar um campo novo', () => {
    expect(toggleSortField('added_desc', 'rating')).toBe('rating_desc')
  })

  it('alterna a direção do campo já ativo', () => {
    expect(toggleSortField('added_desc', 'added')).toBe('added_asc')
    expect(toggleSortField('added_asc', 'added')).toBe('added_desc')
  })

  // Regressão: o ciclo antigo tinha um 3º estado nulo, que apagava o param da URL
  // e fazia a tela cair no default silenciosamente.
  it('nunca cai em estado nulo por mais que se clique', () => {
    const campos = ['added', 'release', 'priority', 'rating', 'title']
    let atual = 'added_desc'
    for (let i = 0; i < 300; i += 1) {
      atual = toggleSortField(atual, campos[i % campos.length])
      expect(atual).toMatch(/^[a-z]+_(asc|desc)$/)
    }
  })

  it('campo sem direção é idempotente', () => {
    expect(toggleSortField('date_desc', 'popularity', true)).toBe('popularity')
    expect(toggleSortField('popularity', 'popularity', true)).toBe('popularity')
  })
})

describe('buildSortValues', () => {
  it('gera asc/desc por campo e valor único pros sem direção', () => {
    expect(buildSortValues(FIELDS)).toEqual([
      'popularity', 'date_asc', 'date_desc', 'rating_asc', 'rating_desc',
    ])
  })
})

describe('buildSortCategories', () => {
  it('gera duas opções por campo direcional', () => {
    const [, data] = buildSortCategories(FIELDS)
    expect(data.label).toBe('Data')
    expect(data.options.map((o) => o.value)).toEqual(['date_asc', 'date_desc'])
    expect(data.options.map((o) => o.ariaLabel)).toEqual(['Mais antigos', 'Mais recentes'])
  })

  it('gera opção única pro campo sem direção', () => {
    const [emAlta] = buildSortCategories(FIELDS)
    expect(emAlta.options).toHaveLength(1)
    expect(emAlta.options[0]).toMatchObject({ value: 'popularity', ariaLabel: 'Populares primeiro' })
  })

  it('mantém todo valor gerado dentro de buildSortValues', () => {
    const validos = buildSortValues(FIELDS)
    const daUi = buildSortCategories(FIELDS).flatMap((c) => c.options.map((o) => o.value))
    expect(daUi.every((v) => validos.includes(v))).toBe(true)
    expect(daUi).toHaveLength(validos.length)
  })
})

describe('getSortIcon', () => {
  it('não renderiza ícone sem direção', () => {
    expect(getSortIcon(null)).toBeNull()
  })
})
