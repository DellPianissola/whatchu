import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { prisma } from '../config/database.js'
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../lib/httpErrors.js'
import { validatePassword } from '../lib/passwordPolicy.js'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './email.js'

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
  validatePassword(password)
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

const generateVerificationToken = () => randomBytes(32).toString('hex')

const TOKEN_TTL = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24h
  PASSWORD_RESET:     30 * 60 * 1000,       // 30min
  EMAIL_CHANGE:       24 * 60 * 60 * 1000,  // 24h
}

// Cria (ou substitui) um token de verificação para o usuário
const upsertVerificationToken = async (userId, type) => {
  const token = generateVerificationToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL[type])
  await prisma.verificationToken.deleteMany({ where: { userId, type } })
  await prisma.verificationToken.create({ data: { userId, token, type, expiresAt } })
  return token
}

// Seleciona apenas campos públicos do user (nunca a senha)
const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  username: true,
  birthDate: true,
  isAdmin: true,
  emailVerified: true,
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

  const verificationToken = await upsertVerificationToken(user.id, 'EMAIL_VERIFICATION')
  // Disparo em background — falha no email não deve bloquear o cadastro
  sendVerificationEmail(user.email, verificationToken).catch(console.error)

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
      emailVerified: user.emailVerified,
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
          avatarUrl: true,
          allowAdultContent: true,
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

export const verifyEmail = async (token) => {
  const record = await prisma.verificationToken.findUnique({ where: { token } })

  if (!record || record.type !== 'EMAIL_VERIFICATION') {
    throw new ValidationError('Token de verificação inválido')
  }
  if (record.expiresAt < new Date()) {
    throw new ValidationError('Token de verificação expirado')
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data:  { emailVerified: true },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])
}

export const resendVerificationEmail = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, emailVerified: true },
  })

  if (!user) throw new NotFoundError('Usuário não encontrado')
  if (user.emailVerified) throw new ValidationError('Email já verificado')

  const token = await upsertVerificationToken(userId, 'EMAIL_VERIFICATION')
  await sendVerificationEmail(user.email, token)
}

// Versão pública (sem autenticação) — usada quando o link expirou e o usuário
// não está logado. Anti-enumeração: responde silenciosamente se o email não existe
// ou já está verificado.
export const resendVerificationEmailByEmail = async (email) => {
  if (!email) return

  const user = await prisma.user.findFirst({
    where:  { email },
    select: { id: true, email: true, emailVerified: true },
  })

  if (!user || user.emailVerified) return

  const token = await upsertVerificationToken(user.id, 'EMAIL_VERIFICATION')
  await sendVerificationEmail(user.email, token)
}

// Permite reset mesmo com email não verificado: a posse do email é provada ao
// clicar no link, e `resetPassword` marca emailVerified = true como efeito.
// Resposta sempre genérica (anti-enumeração) — endpoint não revela se o email existe.
export const requestPasswordReset = async (email) => {
  const user = await prisma.user.findFirst({
    where:  { email },
    select: { id: true, email: true },
  })

  if (!user) return

  const token = await upsertVerificationToken(user.id, 'PASSWORD_RESET')
  await sendPasswordResetEmail(user.email, token)
}

// Reset com sucesso prova posse do email → marca emailVerified = true como efeito.
// Limpa todos os tokens pendentes do usuário (PASSWORD_RESET + EMAIL_VERIFICATION):
// um deles acabou de ser consumido, o outro ficou redundante.
export const resetPassword = async (token, newPassword) => {
  validatePassword(newPassword)

  const record = await prisma.verificationToken.findUnique({ where: { token } })

  if (!record || record.type !== 'PASSWORD_RESET') {
    throw new ValidationError('Token de redefinição inválido')
  }
  if (record.expiresAt < new Date()) {
    throw new ValidationError('Token de redefinição expirado')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data:  { password: hashedPassword, emailVerified: true },
    }),
    prisma.verificationToken.deleteMany({ where: { userId: record.userId } }),
  ])
}
