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
