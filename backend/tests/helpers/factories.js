/**
 * Factories de dados para testes de integração.
 *
 * Inserem direto via Prisma (sem passar pelos services) para que os testes
 * possam montar cenários independentemente das regras de negócio.
 * bcrypt usa 4 rounds pra manter os testes rápidos.
 */
import bcrypt from 'bcrypt'
import { prisma } from './db.js'

export const createUser = async (overrides = {}) => {
  const username = overrides.username ?? 'testuser'
  return prisma.user.create({
    data: {
      email:    overrides.email    ?? `${username}@test.com`,
      username,
      password: await bcrypt.hash(overrides.password ?? 'senha123', 4),
      isAdmin:  overrides.isAdmin  ?? false,
    },
  })
}

export const createProfile = async (userId, overrides = {}) => {
  return prisma.profile.create({
    data: {
      name:        overrides.name        ?? 'Test Profile',
      userId,
      onboardedAt: overrides.onboardedAt ?? null,
    },
  })
}

export const createMovie = async (profileId, overrides = {}) => {
  return prisma.movie.create({
    data: {
      title:      'Test Movie',
      type:       'MOVIE',
      priority:   'MEDIUM',
      genres:     [],
      isNew:      false,
      watched:    false,
      ...overrides,
      // type e priority precisam ser uppercase (enum do Prisma)
      type:     (overrides.type     ?? 'MOVIE').toUpperCase(),
      priority: (overrides.priority ?? 'MEDIUM').toUpperCase(),
      addedById: profileId,
    },
  })
}
