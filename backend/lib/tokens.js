import { randomBytes } from 'crypto'

// 32 bytes = 64 hex chars. Suficiente pra tokens de uso único (verificação,
// reset, troca de email) sem precisar de KDF — entropia direta do crypto.
export const generateRandomToken = () => randomBytes(32).toString('hex')

// TTLs (em ms) por tipo de token. Fonte única de verdade — não duplicar inline.
export const TOKEN_TTL = {
  PENDING_REGISTRATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET:       30 * 60 * 1000,
  EMAIL_CHANGE:         24 * 60 * 60 * 1000,
}
