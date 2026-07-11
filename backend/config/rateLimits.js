import { rateLimit, ipKeyGenerator } from 'express-rate-limit'

const FIFTEEN_MIN = 15 * 60 * 1000
const ONE_MIN = 60 * 1000

// ipKeyGenerator agrega IPv6 por /56 — sem isso, trocar o sufixo burla o limite.
const userOrIpKey = (req) => req.user?.id ?? ipKeyGenerator(req.ip)

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

// Mais apertado que movieWriteLimiter: convite é vetor de spam/assédio entre usuários.
export const friendInviteLimiter = rateLimit({
  windowMs: ONE_MIN,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { error: 'Muitos convites em pouco tempo. Aguarde um momento e tente novamente.' },
})

export const movieWriteLimiter = rateLimit({
  windowMs: ONE_MIN,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { error: 'Muitas alterações em pouco tempo. Aguarde um momento e tente novamente.' },
})
