import { describe, it, expect, beforeEach } from 'vitest'
import {
  getProfile,
  getProfileWithMovies,
  createProfile,
  updateProfile,
  markOnboarded,
  changeEmail,
} from '../../services/profiles.js'
import { truncateAll, prisma } from '../helpers/db.js'
import {
  createUser,
  createProfile as createProfileFactory,
  createMovie,
} from '../helpers/factories.js'
import { NotFoundError, ConflictError, ValidationError } from '../../lib/httpErrors.js'

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

    it('lança ValidationError se tentar alterar username pelo payload', async () => {
      const user = await createUser({ username: 'username_original' })
      await createProfileFactory(user.id)
      await expect(
        updateProfile(user.id, { username: 'username_novo' })
      ).rejects.toThrow(ValidationError)
      const unchanged = await prisma.user.findUnique({ where: { id: user.id } })
      expect(unchanged.username).toBe('username_original')
    })

    it('atualiza birthDate quando fornecida no payload', async () => {
      const user = await createUser()
      await createProfileFactory(user.id)
      const newDate = new Date('1995-06-15')
      const updated = await updateProfile(user.id, { birthDate: newDate })
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      expect(dbUser.birthDate?.toISOString()).toBe(newDate.toISOString())
      // updateProfile retorna o profile; birthDate fica no user — só verifica que não lançou
      expect(updated).toBeDefined()
    })

    it('lança ValidationError para birthDate no futuro', async () => {
      const user = await createUser()
      await createProfileFactory(user.id)
      const future = new Date(Date.now() + 86_400_000)
      await expect(updateProfile(user.id, { birthDate: future })).rejects.toThrow(ValidationError)
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

  // ─── changeEmail ──────────────────────────────────────────────────────────

  describe('changeEmail', () => {
    it('NÃO altera o email — cria token EMAIL_CHANGE com newEmail', async () => {
      const user = await createUser({ email: 'antigo@t.com', password: 'senha123' })
      await createProfileFactory(user.id)
      await changeEmail(user.id, { newEmail: 'novo@t.com', currentPassword: 'senha123' })

      const unchanged = await prisma.user.findUnique({ where: { id: user.id } })
      expect(unchanged.email).toBe('antigo@t.com')

      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'EMAIL_CHANGE' },
      })
      expect(token).not.toBeNull()
      expect(token.newEmail).toBe('novo@t.com')
    })

    it('lança UnauthorizedError quando a senha atual está errada', async () => {
      const user = await createUser({ email: 'me@t.com', password: 'senha123' })
      await createProfileFactory(user.id)
      await expect(
        changeEmail(user.id, { newEmail: 'novo@t.com', currentPassword: 'errada' })
      ).rejects.toThrow(/Senha incorreta/)
    })

    it('lança ValidationError quando currentPassword está ausente', async () => {
      const user = await createUser({ email: 'me@t.com' })
      await createProfileFactory(user.id)
      await expect(
        changeEmail(user.id, { newEmail: 'novo@t.com' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ConflictError se o novo email já pertence a outra conta', async () => {
      await createUser({ email: 'taken@t.com', username: 'owner' })
      const user = await createUser({ email: 'me@t.com', username: 'me', password: 'senha123' })
      await createProfileFactory(user.id)
      await expect(
        changeEmail(user.id, { newEmail: 'taken@t.com', currentPassword: 'senha123' })
      ).rejects.toThrow(/cadastrado por outra conta/)
    })

    it('lança ValidationError ao tentar mudar para o mesmo email atual', async () => {
      const user = await createUser({ email: 'mesmo@t.com', password: 'senha123' })
      await createProfileFactory(user.id)
      await expect(
        changeEmail(user.id, { newEmail: 'mesmo@t.com', currentPassword: 'senha123' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para email com formato inválido', async () => {
      const user = await createUser({ password: 'senha123' })
      await createProfileFactory(user.id)
      await expect(
        changeEmail(user.id, { newEmail: 'nao-e-um-email', currentPassword: 'senha123' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança NotFoundError para userId inexistente', async () => {
      await expect(
        changeEmail('00000000-0000-0000-0000-000000000000', { newEmail: 'x@y.com', currentPassword: 'senha123' })
      ).rejects.toThrow(NotFoundError)
    })
  })

})
