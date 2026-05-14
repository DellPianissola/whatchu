import { prisma } from '../config/database.js'
import { requireUserProfile } from '../lib/profileHelpers.js'
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../lib/httpErrors.js'
import { generateRandomToken, TOKEN_TTL } from '../lib/tokens.js'
import { sendEmailChangeVerification } from './email.js'

// `_count.movies` aparece em várias queries — extraído pra constante.
const COUNT_MOVIES = { _count: { select: { movies: true } } }

// ─── Operações públicas ─────────────────────────────────────────────────────

export const getProfile = async (userId) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: COUNT_MOVIES,
  })
  if (!profile) {
    throw new NotFoundError('Perfil não encontrado')
  }
  return profile
}

export const getProfileWithMovies = async (userId) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      movies: {
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      },
      ...COUNT_MOVIES,
    },
  })
  if (!profile) {
    throw new NotFoundError('Perfil não encontrado')
  }
  return profile
}

export const createProfile = async (userId, fallbackUsername, payload = {}) => {
  const existing = await prisma.profile.findUnique({ where: { userId } })
  if (existing) {
    throw new ConflictError('Usuário já possui um perfil')
  }

  return prisma.profile.create({
    data: {
      name: payload.name || fallbackUsername,
      userId,
    },
  })
}

export const updateProfile = async (userId, payload) => {
  await requireUserProfile(userId)

  const profileData = {}
  if (payload.name !== undefined) profileData.name = payload.name

  // birthDate fica no model User, não no Profile
  if (payload.birthDate !== undefined) {
    const date = new Date(payload.birthDate)
    if (isNaN(date.getTime())) throw new ValidationError('Data de nascimento inválida')
    if (date > new Date()) throw new ValidationError('Data de nascimento não pode ser no futuro')
    await prisma.user.update({ where: { id: userId }, data: { birthDate: date } })
  }

  // username é campo de login — nunca permitido aqui (payload ignorado silenciosamente)

  return prisma.profile.update({
    where: { userId },
    data:  profileData,
  })
}

export const changeEmail = async (userId, newEmail) => {
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new ValidationError('Email inválido')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })
  if (!user) throw new NotFoundError('Usuário não encontrado')
  if (user.email === newEmail) throw new ValidationError('O novo email é igual ao atual')

  const token = generateRandomToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL.EMAIL_CHANGE)

  const dup = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })
  if (dup && dup.id !== userId) {
    throw new ConflictError('Email já cadastrado por outra conta')
  }

  // TODO: idealmente a troca só deveria efetivar APÓS verificação no novo endereço,
  // pra não permitir que sessão comprometida sequestre a conta via email. Implementação
  // atual mantém o comportamento legado (troca imediata + email informativo).
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data:  { email: newEmail },
    }),
    prisma.verificationToken.deleteMany({ where: { userId, type: 'EMAIL_CHANGE' } }),
    prisma.verificationToken.create({
      data: { userId, token, type: 'EMAIL_CHANGE', expiresAt },
    }),
  ])

  sendEmailChangeVerification(newEmail, token).catch(console.error)
}

export const setAdultContentPreference = async (userId, enabled) => {
  const profile = await prisma.profile.findUnique({
    where:   { userId },
    include: { user: { select: { birthDate: true } } },
  })
  if (!profile) throw new NotFoundError('Perfil não encontrado')

  // Desativar não exige verificações
  if (!enabled) {
    return prisma.profile.update({ where: { userId }, data: { allowAdultContent: false } })
  }

  const { user } = profile
  if (!user.birthDate) {
    throw new ForbiddenError('Informe sua data de nascimento para acessar esta configuração', {
      code: 'BIRTHDATE_REQUIRED',
    })
  }

  const age = Math.floor((Date.now() - user.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 18) {
    throw new ForbiddenError('É necessário ter 18 anos ou mais para acessar esta configuração', {
      code: 'UNDERAGE',
    })
  }

  return prisma.profile.update({ where: { userId }, data: { allowAdultContent: true } })
}

export const markOnboarded = async (userId) => {
  const profile = await requireUserProfile(userId)

  if (profile.onboardedAt) {
    return { profile, alreadyCompleted: true }
  }

  const updated = await prisma.profile.update({
    where: { userId },
    data: { onboardedAt: new Date() },
  })

  return { profile: updated, alreadyCompleted: false }
}
