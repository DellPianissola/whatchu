import { describe, it, expect, beforeEach } from 'vitest'
import {
  getProfile,
  getProfileWithMovies,
  createProfile,
  updateProfile,
  markOnboarded,
  changeEmail,
  setAdultContentPreference,
} from '../../services/profiles.js'
import { truncateAll, prisma } from '../helpers/db.js'
import {
  createUser,
  createProfile as createProfileFactory,
  createMovie,
} from '../helpers/factories.js'
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../lib/httpErrors.js'

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

    it('ignora campo username mesmo que esteja no payload', async () => {
      const user = await createUser({ username: 'username_original' })
      await createProfileFactory(user.id)
      await updateProfile(user.id, { username: 'username_novo' })
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
    it('atualiza o email e cria token EMAIL_CHANGE', async () => {
      const user = await createUser({ email: 'antigo@t.com' })
      await createProfileFactory(user.id)
      await changeEmail(user.id, 'novo@t.com')
      const updated = await prisma.user.findUnique({ where: { id: user.id } })
      expect(updated.email).toBe('novo@t.com')
      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'EMAIL_CHANGE' },
      })
      expect(token).not.toBeNull()
    })

    it('lança ConflictError se o novo email já pertence a outra conta', async () => {
      await createUser({ email: 'taken@t.com', username: 'owner' })
      const user = await createUser({ email: 'me@t.com', username: 'me' })
      await createProfileFactory(user.id)
      await expect(changeEmail(user.id, 'taken@t.com')).rejects.toThrow(/cadastrado por outra conta/)
    })

    it('lança ValidationError ao tentar mudar para o mesmo email atual', async () => {
      const user = await createUser({ email: 'mesmo@t.com' })
      await createProfileFactory(user.id)
      await expect(changeEmail(user.id, 'mesmo@t.com')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para email com formato inválido', async () => {
      const user = await createUser()
      await createProfileFactory(user.id)
      await expect(changeEmail(user.id, 'nao-e-um-email')).rejects.toThrow(ValidationError)
    })

    it('lança NotFoundError para userId inexistente', async () => {
      await expect(
        changeEmail('00000000-0000-0000-0000-000000000000', 'x@y.com')
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ─── setAdultContentPreference ────────────────────────────────────────────

  describe('setAdultContentPreference', () => {
    const adultBirthDate = () => {
      const d = new Date()
      d.setFullYear(d.getFullYear() - 20)
      return d
    }
    const minorBirthDate = () => {
      const d = new Date()
      d.setFullYear(d.getFullYear() - 16)
      return d
    }

    it('ativa a opção para usuário maior de 18', async () => {
      const user = await createUser({ birthDate: adultBirthDate() })
      await createProfileFactory(user.id)
      const updated = await setAdultContentPreference(user.id, true)
      expect(updated.allowAdultContent).toBe(true)
    })

    it('desativa a opção sem exigir verificações (só define como false)', async () => {
      const user = await createUser({ birthDate: adultBirthDate() })
      await createProfileFactory(user.id, { allowAdultContent: true })
      const updated = await setAdultContentPreference(user.id, false)
      expect(updated.allowAdultContent).toBe(false)
    })

    it('lança ForbiddenError para menor de 18', async () => {
      const user = await createUser({ birthDate: minorBirthDate() })
      await createProfileFactory(user.id)
      await expect(setAdultContentPreference(user.id, true)).rejects.toThrow(ForbiddenError)
    })

    it('lança ForbiddenError quando birthDate não está definido', async () => {
      const user = await createUser({ birthDate: null })
      await createProfileFactory(user.id)
      await expect(setAdultContentPreference(user.id, true)).rejects.toThrow(ForbiddenError)
    })

    it('lança NotFoundError quando não tem perfil', async () => {
      const user = await createUser({ birthDate: adultBirthDate() })
      await expect(setAdultContentPreference(user.id, true)).rejects.toThrow(NotFoundError)
    })
  })
})
