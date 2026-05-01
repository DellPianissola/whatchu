/**
 * Erros tipados de HTTP — services lançam, o middleware central traduz pra
 * status code + JSON. Permite que services não toquem em `req`/`res`.
 *
 * Uso (em service):
 *   throw new NotFoundError('Perfil não encontrado')
 *
 * Uso (em service, com código pra cliente):
 *   throw new NotFoundError('Sua lista está vazia', { code: 'EMPTY_LIST' })
 */

export class HttpError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    // `code` é opcional — string que o frontend pode usar pra distinguir cenários
    // (ex.: 'EMPTY_LIST' vs 'PROFILE_NOT_FOUND', ambos 404).
    this.code = options.code
    // `details` é opcional — payload extra (ex.: campos inválidos numa validação).
    this.details = options.details
  }
}

export class ValidationError extends HttpError {
  constructor(message, options) {
    super(400, message, options)
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Não autorizado', options) {
    super(401, message, options)
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Acesso negado', options) {
    super(403, message, options)
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Recurso não encontrado', options) {
    super(404, message, options)
  }
}

export class ConflictError extends HttpError {
  constructor(message, options) {
    super(409, message, options)
  }
}

// Falha em API externa (TMDB/Jikan). Mapeia o status do upstream pro status
// HTTP correto da nossa API, pra que o frontend distinga "API externa fora"
// de "bug do nosso backend":
//   - 429 do upstream → 503 (Service Unavailable, com Retry-After conceitual)
//   - 5xx ou rede     → 502 (Bad Gateway)
//   - resto           → 502 (default)
//
// `code` ajuda o frontend a customizar a mensagem (UPSTREAM_RATE_LIMIT,
// UPSTREAM_DOWN). `source` no details indica qual API caiu (TMDB/JIKAN).
export class UpstreamError extends HttpError {
  constructor(source, upstreamStatus, message, options = {}) {
    const isRateLimit = upstreamStatus === 429
    const statusCode  = isRateLimit ? 503 : 502
    const code        = options.code ?? (isRateLimit ? 'UPSTREAM_RATE_LIMIT' : 'UPSTREAM_DOWN')
    super(statusCode, message, {
      code,
      details: { source, upstreamStatus, ...(options.details ?? {}) },
    })
  }
}
