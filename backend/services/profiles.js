import bcrypt from 'bcrypt'
import { prisma } from '../config/database.js'
import { requireUserProfile } from '../lib/profileHelpers.js'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
} from '../lib/httpErrors.js'
import { upsertVerificationToken } from './auth.js'
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

export const changeEmail = async (userId, { newEmail, currentPassword } = {}) => {
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new ValidationError('Email inválido')
  }
  if (!currentPassword) {
    throw new ValidationError('Senha atual é obrigatória')
  }

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, password: true },
  })
  if (!user) throw new NotFoundError('Usuário não encontrado')
  if (user.email === newEmail) throw new ValidationError('O novo email é igual ao atual')

  const passwordMatch = await bcrypt.compare(currentPassword, user.password)
  if (!passwordMatch) throw new UnauthorizedError('Senha incorreta')

  const dup = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })
  if (dup && dup.id !== userId) {
    throw new ConflictError('Email já cadastrado por outra conta')
  }

  const token = await upsertVerificationToken(userId, 'EMAIL_CHANGE', { newEmail })
  await sendEmailChangeVerification(newEmail, token)
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
