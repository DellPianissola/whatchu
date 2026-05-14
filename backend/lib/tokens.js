import { randomBytes } from 'crypto'

// 32 bytes = 64 hex chars — entropia direta, sem KDF (tokens são uso único e curtos).
export const generateRandomToken = () => randomBytes(32).toString('hex')

// TTLs em ms — não duplicar inline
export const TOKEN_TTL = {
  PENDING_REGISTRATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET:       30 * 60 * 1000,
  EMAIL_CHANGE:         24 * 60 * 60 * 1000,
}
