import { describe, it, expect, beforeEach } from 'vitest'
import {
  getProfile,
  getProfileWithMovies,
  createProfile,
  updateProfile,
  markOnboarded,
} from '../../services/profiles.js'
import { truncateAll } from '../helpers/db.js'
import {
  createUser,
  createProfile as createProfileFactory,
  createMovie,
} from '../helpers/factories.js'
import { NotFoundError, ConflictError } from '../../lib/httpErrors.js'

describe('profiles service', () => {
  beforeEach(() => truncateAll())

  // ─── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('devolve o perfil com _count.movies quando existe', async () => {
      const user = await createUser()
      await createProfileFactory(user.id, { name: 'Meu Perfil' })
      const result = await getProfile(user.id)
      expect(result.name).toBe('Meu Perfil')
      expect(result._count.movies).toBe(0)
    })

    it('lança NotFoundError quando não existe perfil', async () => {
      const user = await createUser()
      await expect(getProfile(user.id)).rejects.toThrow(NotFoundError)
    })
  })

  // ─── getProfileWithMovies ──────────────────────────────────────────────────

  describe('getProfileWithMovies', () => {
    it('inclui movies no resultado', async () => {
      const user    = await createUser()
      const profile = await createProfileFactory(user.id)
      await createMovie(profile.id, { title: 'Meu Filme' })

      const result = await getProfileWithMovies(user.id)
      expect(result.movies).toHaveLength(1)
      expect(result.movies[0].title).toBe('Meu Filme')
    })

    it('lança NotFoundError quando não existe perfil', async () => {
      const user = await createUser()
      await expect(getProfileWithMovies(user.id)).rejects.toThrow(NotFoundError)
    })
  })

  // ─── createProfile ─────────────────────────────────────────────────────────

  describe('createProfile', () => {
    it('cria perfil com nome do payload', async () => {
      const user    = await createUser()
      const profile = await createProfile(user.id, 'fallback', { name: 'Nome Customizado' })
      expect(profile.name).toBe('Nome Customizado')
    })

    it('usa fallbackUsername quando payload não tem nome', async () => {
      const user    = await createUser()
      const profile = await createProfile(user.id, 'fallback_name')
      expect(profile.name).toBe('fallback_name')
    })

    it('lança ConflictError se perfil já existe', async () => {
      const user = await createUser()
      await createProfileFactory(user.id)
      await expect(createProfile(user.id, 'x')).rejects.toThrow(ConflictError)
    })
  })

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('atualiza o nome', async () => {
      const user = await createUser()
      await createProfileFactory(user.id, { name: 'Antigo' })
      const updated = await updateProfile(user.id, { name: 'Novo Nome' })
      expect(updated.name).toBe('Novo Nome')
    })

    it('payload vazio não altera o nome', async () => {
      const user = await createUser()
      await createProfileFactory(user.id, { name: 'Original' })
      const updated = await updateProfile(user.id, {})
      expect(updated.name).toBe('Original')
    })

    it('lança NotFoundError se não tem perfil', async () => {
      const user = await createUser()
      await expect(updateProfile(user.id, { name: 'x' })).rejects.toThrow(NotFoundError)
    })
  })

  // ─── markOnboarded ─────────────────────────────────────────────────────────

  describe('markOnboarded', () => {
    it('seta onboardedAt na primeira chamada (alreadyCompleted: false)', async () => {
      const user = await createUser()
      await createProfileFactory(user.id)
      const { profile, alreadyCompleted } = await markOnboarded(user.id)
      expect(alreadyCompleted).toBe(false)
      expect(profile.onboardedAt).toBeInstanceOf(Date)
    })

    it('é idempotente: segunda chamada devolve alreadyCompleted: true sem alterar a data', async () => {
      const user = await createUser()
      await createProfileFactory(user.id)
      const { profile: first }          = await markOnboarded(user.id)
      const { profile: second, alreadyCompleted } = await markOnboarded(user.id)
      expect(alreadyCompleted).toBe(true)
      expect(second.onboardedAt?.getTime()).toBe(first.onboardedAt?.getTime())
    })

    it('lança NotFoundError se não tem perfil', async () => {
      const user = await createUser()
      await expect(markOnboarded(user.id)).rejects.toThrow(NotFoundError)
    })
  })
})
