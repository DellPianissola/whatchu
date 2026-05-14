import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database.js'
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../lib/httpErrors.js'
import { validatePassword } from '../lib/passwordPolicy.js'
import { generateRandomToken, TOKEN_TTL } from '../lib/tokens.js'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './email.js'

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

const upsertVerificationToken = async (userId, type) => {
  const token = generateRandomToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL[type])
  await prisma.verificationToken.deleteMany({ where: { userId, type } })
  await prisma.verificationToken.create({ data: { userId, token, type, expiresAt } })
  return token
}

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  username: true,
  birthDate: true,
  isAdmin: true,
  createdAt: true,
}

// Squat protection: múltiplos Pendings paralelos com mesmo email coexistem;
// quem verificar primeiro materializa o User (UNIQUE em users.email decide a corrida).
export const registerUser = async ({ email, username, password, birthDate }) => {
  validateRegistrationInput({ email, username, password, birthDate })

  const [existingUsername, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
    prisma.user.findUnique({ where: { email },    select: { id: true } }),
  ])

  if (existingUsername) {
    throw new ConflictError('Nome de usuário já cadastrado')
  }
  // Email já em uso: resposta idêntica a sucesso (anti-enum). User legítimo
  // que esqueceu cai no fluxo de "esqueci senha".
  if (existingEmail) {
    return { pending: true, email }
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const token = generateRandomToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL.PENDING_REGISTRATION)

  // Re-cadastro idempotente do mesmo (email, username). Pendings de outros
  // usernames com este email continuam vivos — competição saudável.
  await prisma.pendingRegistration.deleteMany({ where: { email, username } })

  await prisma.pendingRegistration.create({
    data: {
      email,
      username,
      password: hashedPassword,
      birthDate: birthDate ? new Date(birthDate) : null,
      token,
      expiresAt,
    },
  })

  // Background — falha no email não bloqueia o cadastro
  sendVerificationEmail(email, token).catch(console.error)

  return { pending: true, email }
}

export const verifyEmail = async (token) => {
  const pending = await prisma.pendingRegistration.findUnique({ where: { token } })

  if (!pending) {
    throw new ValidationError('Token de verificação inválido')
  }
  if (pending.expiresAt < new Date()) {
    await prisma.pendingRegistration.delete({ where: { token } }).catch(() => {})
    throw new ValidationError('Token de verificação expirado')
  }

  let user, profile
  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email:     pending.email,
          username:  pending.username,
          password:  pending.password,
          birthDate: pending.birthDate,
        },
        select: PUBLIC_USER_FIELDS,
      })
      const newProfile = await tx.profile.create({
        data: { name: newUser.username, userId: newUser.id },
      })
      // Concorrentes (Pendings com mesmo email) perderam a corrida
      await tx.pendingRegistration.deleteMany({ where: { email: pending.email } })
      return { user: newUser, profile: newProfile }
    })
    user = result.user
    profile = result.profile
  } catch (err) {
    // P2002: outro Pending materializou antes (corrida de UNIQUE)
    if (err.code === 'P2002') {
      const target = err.meta?.target?.join(',') || 'email'
      await prisma.pendingRegistration.delete({ where: { token } }).catch(() => {})
      throw new ConflictError(
        target.includes('username')
          ? 'Nome de usuário já cadastrado por outra conta. Tente novamente com outro.'
          : 'Já existe uma conta com este email. Use "Esqueci minha senha" para acessar.',
        { code: target.includes('username') ? 'USERNAME_TAKEN' : 'EMAIL_TAKEN' },
      )
    }
    throw err
  }

  const tokens = generateTokens(user.id, user.username)
  return { user, profile, ...tokens }
}

// Anti-enum: silencia se não há Pending pra este email.
// orderBy desc: se houver múltiplos Pendings (usernames diferentes), renova o mais recente.
export const resendVerificationEmailByEmail = async (email) => {
  if (!email) return

  const pending = await prisma.pendingRegistration.findFirst({
    where:   { email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, email: true },
  })

  if (!pending) return

  const newToken = generateRandomToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL.PENDING_REGISTRATION)
  await prisma.pendingRegistration.update({
    where: { id: pending.id },
    data:  { token: newToken, expiresAt },
  })
  await sendVerificationEmail(pending.email, newToken)
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

// Anti-enum: silencia se não há User com aquele email.
export const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, email: true },
  })

  if (!user) return

  const token = await upsertVerificationToken(user.id, 'PASSWORD_RESET')
  await sendPasswordResetEmail(user.email, token)
}

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
      data:  { password: hashedPassword },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])
}

export const cleanupExpiredPendingRegistrations = async () => {
  const result = await prisma.pendingRegistration.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
