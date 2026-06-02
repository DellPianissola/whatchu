import { rateLimit } from 'express-rate-limit'

const FIFTEEN_MIN = 15 * 60 * 1000
const ONE_MIN = 60 * 1000

export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
})

export const emailDispatchLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações. Tente novamente em 15 minutos.' },
})

export const publicApiLimiter = rateLimit({
  windowMs: ONE_MIN,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um momento e tente novamente.' },
})

export const movieWriteLimiter = rateLimit({
  windowMs: ONE_MIN,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  message: { error: 'Muitas alterações em pouco tempo. Aguarde um momento e tente novamente.' },
})
