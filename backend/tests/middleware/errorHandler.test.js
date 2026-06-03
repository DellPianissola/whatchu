import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { errorHandler } from '../../middleware/errorHandler.js'
import { logger } from '../../lib/logger.js'
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '../../lib/httpErrors.js'
import { buildReq, buildRes, buildNext } from '../helpers/express.js'

describe('errorHandler middleware', () => {
  const req = buildReq()
  const next = buildNext()

  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    delete process.env.NODE_ENV
  })

  // ─── HttpError tipado ─────────────────────────────────────────────────────

  describe('com HttpError tipado', () => {
    it('deve usar statusCode da classe e devolver message', () => {
      const res = buildRes()
      errorHandler(new NotFoundError('Filme não encontrado'), req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Filme não encontrado' })
    })

    it('deve incluir code quando o erro carrega code', () => {
      const res = buildRes()
      errorHandler(
        new NotFoundError('Sua lista está vazia', { code: 'EMPTY_LIST' }),
        req, res, next
      )

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Sua lista está vazia',
        code: 'EMPTY_LIST',
      })
    })

    it('deve incluir details quando o erro carrega details', () => {
      const res = buildRes()
      const details = { campo: 'email' }
      errorHandler(new ValidationError('inválido', { details }), req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        error: 'inválido',
        details,
      })
    })

    it('NÃO deve logar pra HttpError < 500 (são esperados)', () => {
      const res = buildRes()
      errorHandler(new ValidationError('x'), req, res, next)

      expect(logger.error).not.toHaveBeenCalled()
    })

    it.each([
      [new ValidationError('x'), 400],
      [new UnauthorizedError(), 401],
      [new NotFoundError(), 404],
      [new ConflictError('dup'), 409],
    ])('deve mapear %s pra status %i', (err, expectedStatus) => {
      const res = buildRes()
      errorHandler(err, req, res, next)
      expect(res.status).toHaveBeenCalledWith(expectedStatus)
    })
  })

  // ─── Prisma P2002 (unique constraint) ─────────────────────────────────────

  describe('com Prisma P2002 (unique violation)', () => {
    it('deve devolver 409 com code UNIQUE_VIOLATION', () => {
      const res = buildRes()
      const prismaErr = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      })

      errorHandler(prismaErr, req, res, next)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Registro já existe (violação de unicidade)',
        code: 'UNIQUE_VIOLATION',
      })
    })
  })

  // ─── Erros genéricos / não tratados ───────────────────────────────────────

  describe('com erro genérico (não tratado)', () => {
    it('deve devolver 500 e logar o erro', () => {
      const res = buildRes()
      const erro = new Error('coisa inesperada')

      errorHandler(erro, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(logger.error).toHaveBeenCalledWith({ err: erro }, 'Erro não tratado')
    })

    it('em dev (NODE_ENV !== production) deve incluir details com a mensagem', () => {
      process.env.NODE_ENV = 'development'
      const res = buildRes()

      errorHandler(new Error('detalhe técnico'), req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        error: 'Erro interno do servidor',
        details: 'detalhe técnico',
      })
    })

    it('em produção NÃO deve incluir details (evita vazar info interna)', () => {
      process.env.NODE_ENV = 'production'
      const res = buildRes()

      errorHandler(new Error('senha=abc123 falhou no DB'), req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        error: 'Erro interno do servidor',
      })
      // Garante que details NÃO foi incluído
      const body = res.json.mock.calls[0][0]
      expect(body.details).toBeUndefined()
    })
  })

  // ─── Comportamento de fluxo ───────────────────────────────────────────────

  it('NÃO deve chamar next (é o middleware terminal)', () => {
    const res = buildRes()
    const localNext = vi.fn()

    errorHandler(new ValidationError('x'), req, res, localNext)

    expect(localNext).not.toHaveBeenCalled()
  })
})
