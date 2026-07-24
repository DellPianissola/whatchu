import { describe, it, expect } from 'vitest'
import { parseCsvParam, toggleInList } from './queryParams.js'

describe('parseCsvParam', () => {
  it('separa e limpa espaços', () => {
    expect(parseCsvParam('Ação, Drama ,Terror')).toEqual(['Ação', 'Drama', 'Terror'])
  })

  it('devolve lista vazia pra ausência de valor', () => {
    expect(parseCsvParam(null)).toEqual([])
    expect(parseCsvParam('')).toEqual([])
  })

  it('descarta entradas vazias', () => {
    expect(parseCsvParam('Ação,,Drama,')).toEqual(['Ação', 'Drama'])
  })
})

describe('toggleInList', () => {
  it('adiciona o que não está na lista', () => {
    expect(toggleInList(['a'], 'b')).toEqual(['a', 'b'])
  })

  it('remove o que já está', () => {
    expect(toggleInList(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('não muta a lista original', () => {
    const original = ['a']
    toggleInList(original, 'b')
    expect(original).toEqual(['a'])
  })

  it('volta ao estado inicial ao alternar duas vezes', () => {
    expect(toggleInList(toggleInList(['a'], 'b'), 'b')).toEqual(['a'])
  })
})
