import jwt from 'jsonwebtoken'
import { prisma } from '../config/database.js'
import { UnauthorizedError } from '../lib/httpErrors.js'
import { PUBLIC_USER_FIELDS } from '../lib/userSelectors.js'

const USER_CACHE_TTL_MS = 30 * 1000
const userCache = new Map()

const getCachedUser = (userId) => {
  const entry = userCache.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    userCache.delete(userId)
    return null
  }
  return entry.user
}

const setCachedUser = (userId, user) => {
  userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS })
}

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1]
    if (!token) {
      return next(new UnauthorizedError('Token de acesso não fornecido'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    let user = getCachedUser(decoded.userId)
    if (!user) {
      user = await prisma.user.findUnique({
        where:  { id: decoded.userId },
        select: PUBLIC_USER_FIELDS,
      })
      if (!user) return next(new UnauthorizedError('Usuário não encontrado'))
      setCachedUser(user.id, user)
    }

    req.user = user
    next()
  } catch {
    next(new UnauthorizedError('Token inválido ou expirado'))
  }
}

export const invalidateUserCache = (userId) => {
  userCache.delete(userId)
}
