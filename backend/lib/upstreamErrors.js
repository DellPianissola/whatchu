// Helpers pra lidar com erros vindos de APIs externas (TMDB, Jikan, futuros).
//
// Por que existem:
//   - `error.message` puro do axios costuma ser inútil ("Error" ou genérico).
//     A info útil mora em `error.response.status/data` (HTTP) ou `error.code`
//     (rede/transporte: ENOTFOUND, ECONNREFUSED, ETIMEDOUT).
//   - Services externos não devem propagar erro genérico — middleware central
//     traduziria pra 500 e o frontend trataria como bug nosso. Em vez disso,
//     lançamos UpstreamError tipada → 502/503 + code, deixando claro que o
//     problema é upstream.

import { UpstreamError } from './httpErrors.js'

// Descrição legível de erro de axios pra log. Status + body (truncado) ou code.
export const describeAxiosError = (error) => {
  if (error.response) {
    const body = typeof error.response.data === 'string'
      ? error.response.data.slice(0, 200)
      : JSON.stringify(error.response.data).slice(0, 200)
    return `HTTP ${error.response.status} — ${body}`
  }
  if (error.code) {
    return `${error.code} — ${error.message}`
  }
  return error.message || 'erro desconhecido'
}

// Factory: cria a função `toUpstreamError` ligada a uma source (TMDB/JIKAN).
// Cada service externo cria a sua e usa em todos os catches.
//
// Uso:
//   const toUpstreamError = makeUpstreamErrorFactory('TMDB')
//   try { ... } catch (e) {
//     console.error('Erro X:', describeAxiosError(e))
//     throw toUpstreamError(e, 'descrição da operação')
//   }
export const makeUpstreamErrorFactory = (source) => (error, operation) => {
  const detail = describeAxiosError(error)
  const upstreamStatus = error.response?.status ?? null
  return new UpstreamError(source, upstreamStatus, `${operation}: ${detail}`)
}
