import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database.js'
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../lib/httpErrors.js'

// ─── Helpers internos ───────────────────────────────────────────────────────

const generateTokens = (userId, username) => {
  const accessToken = jwt.sign(
    { userId, username },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' }
  )
  return { accessToken, refreshToken }
}

const validateRegistrationInput = ({ email, username, password, birthDate }) => {
  if (!email || !username || !password) {
    throw new ValidationError('Email, nome de usuário e senha são obrigatórios')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Email inválido')
  }
  if (password.length < 8) {
    throw new ValidationError('Senha deve ter no mínimo 8 caracteres')
  }
  if (birthDate) {
    const date = new Date(birthDate)
    if (isNaN(date.getTime())) {
      throw new ValidationError('Data de nascimento inválida')
    }
    if (date > new Date()) {
      throw new ValidationError('Data de nascimento não pode ser no futuro')
    }
  }
}

const decodeRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Refresh token inválido')
    }
    return decoded
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err
    throw new UnauthorizedError('Refresh token inválido ou expirado')
  }
}

// Seleciona apenas campos públicos do user (nunca a senha)
const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  username: true,
  birthDate: true,
  isAdmin: true,
  createdAt: true,
}

// ─── Operações públicas (chamadas pelas rotas) ──────────────────────────────

export const registerUser = async ({ email, username, password, birthDate }) => {
  validateRegistrationInput({ email, username, password, birthDate })

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    throw new ConflictError('Nome de usuário já cadastrado')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      birthDate: birthDate ? new Date(birthDate) : null,
    },
    select: PUBLIC_USER_FIELDS,
  })

  const profile = await prisma.profile.create({
    data: { name: username, userId: user.id },
  })

  const tokens = generateTokens(user.id, user.username)

  return { user, profile, ...tokens }
}

export const loginUser = async ({ username, password }) => {
  if (!username || !password) {
    throw new ValidationError('Usuário e senha são obrigatórios')
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { profile: true },
  })

  if (!user) {
    throw new UnauthorizedError('Usuário ou senha inválidos')
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    throw new UnauthorizedError('Usuário ou senha inválidos')
  }

  const tokens = generateTokens(user.id, user.username)

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    },
    profile: user.profile,
    ...tokens,
  }
}

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PUBLIC_USER_FIELDS,
      profile: {
        select: {
          id: true,
          name: true,
          userId: true,
          onboardedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { movies: true } },
        },
      },
    },
  })

  if (!user) {
    throw new NotFoundError('Usuário não encontrado')
  }

  return user
}

export const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token não fornecido')
  }

  const decoded = decodeRefreshToken(refreshToken)

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, username: true },
  })

  if (!user) {
    throw new UnauthorizedError('Usuário não encontrado')
  }

  return generateTokens(user.id, user.username)
}
