import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/analytics.js', () => ({ trackException: vi.fn() }))

import { trackException } from '../services/analytics.js'
import ErrorBoundary from './ErrorBoundary.jsx'

beforeEach(() => vi.clearAllMocks())

describe('ErrorBoundary', () => {
  it('entra em estado de falha quando um filho lança', () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error('boom'))).toEqual({ failed: true })
  })

  it('reporta a mensagem do erro', () => {
    const boundary = new ErrorBoundary({})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    boundary.componentDidCatch(new Error('quebrou'), { componentStack: '' })

    expect(trackException).toHaveBeenCalledWith('quebrou')
  })

  it('reporta mesmo quando o que foi lançado não é um Error', () => {
    const boundary = new ErrorBoundary({})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    boundary.componentDidCatch('string solta', { componentStack: '' })

    expect(trackException).toHaveBeenCalledWith('string solta')
  })

  it('devolve os filhos enquanto nada falhou', () => {
    const boundary = new ErrorBoundary({ children: 'conteúdo' })
    boundary.state = { failed: false }

    expect(boundary.render()).toBe('conteúdo')
  })
})
