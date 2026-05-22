import { HttpError } from '../lib/httpErrors.js'

/**
 * Middleware central de tratamento de erros.
 *
 * Deve ser registrado por ÚLTIMO no app, depois de todas as rotas.
 * Recebe qualquer erro lançado em handlers (envolvidos com asyncHandler) e
 * em middlewares, e devolve uma resposta JSON consistente.
 *
 * Categorias:
 *   - HttpError tipado (NotFoundError, ValidationError, etc) → usa o statusCode/code da classe.
 *   - Prisma error com código P2002 (unique constraint) → 409.
 *   - Qualquer outro → 500 + log no console.
 *
 * Em dev (NODE_ENV !== 'production'), inclui `details` com mensagem original do erro
 * pra facilitar debug. Em prod, omite pra não vazar detalhes internos.
 */
export const errorHandler = (err, req, res, _next) => {
  // Erro tipado da nossa lib — confiável, devolve direto.
  if (err instanceof HttpError) {
    if (err.statusCode >= 500) console.error(`[${err.name}]`, err.message, err.details ?? '')
    const body = { error: err.message }
    if (err.code) body.code = err.code
    if (err.details) body.details = err.details
    return res.status(err.statusCode).json(body)
  }

  // Prisma: violação de unique constraint
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Registro já existe (violação de unicidade)',
      code: 'UNIQUE_VIOLATION',
    })
  }

  // Erro inesperado — loga e devolve 500 genérico
  console.error('Erro não tratado:', err)
  const body = { error: 'Erro interno do servidor' }
  if (process.env.NODE_ENV !== 'production') {
    body.details = err.message
  }
  return res.status(500).json(body)
}
