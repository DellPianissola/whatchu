import { randomBytes } from 'crypto'

const HOUR = 60 * 60 * 1000
const DAY  = 24 * HOUR

// 32 bytes = 64 hex chars — entropia direta, sem KDF (tokens são uso único e curtos).
export const generateRandomToken = () => randomBytes(32).toString('hex')

export const TOKEN_TTL = {
  PENDING_REGISTRATION: DAY,
  PASSWORD_RESET:       30 * 60 * 1000,
  EMAIL_CHANGE:         DAY,
}

export const JWT_TTL = {
  ACCESS:  '1h',
  REFRESH: '30d',
}
