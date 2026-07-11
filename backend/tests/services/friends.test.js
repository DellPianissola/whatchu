import { describe, it, expect, beforeEach } from 'vitest'
import {
  sendInvite,
  listFriends,
  respondInvite,
  removeFriendship,
  requireAcceptedFriendIds,
} from '../../services/friends.js'
import { prisma, truncateAll } from '../helpers/db.js'
import { createUser, createProfile, createFriendship, createMovie } from '../helpers/factories.js'
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../lib/httpErrors.js'

describe('friends service', () => {
  let user, profile, amigo, amigoPerfil

  beforeEach(async () => {
    await truncateAll()
    user        = await createUser()
    profile     = await createProfile(user.id)
    amigo       = await createUser({ username: 'amigo' })
    amigoPerfil = await createProfile(amigo.id, { name: 'Amigo' })
  })

  describe('sendInvite', () => {
    it('cria convite PENDING e devolve o perfil convidado', async () => {
      const invite = await sendInvite(user.id, { username: 'amigo' })
      expect(invite.status).toBe('PENDING')
      expect(invite.profile).toMatchObject({ id: amigoPerfil.id, username: 'amigo' })
    })

    it('aceita username com case diferente', async () => {
      const invite = await sendInvite(user.id, { username: 'AMIGO' })
      expect(invite.profile.id).toBe(amigoPerfil.id)
    })

    it('prefere o match exato quando existem usernames que diferem só por caixa', async () => {
      const caps       = await createUser({ username: 'AMIGO', email: 'caps@test.com' })
      const capsPerfil = await createProfile(caps.id, { name: 'Caps' })
      const invite = await sendInvite(user.id, { username: 'AMIGO' })
      expect(invite.profile.id).toBe(capsPerfil.id)
    })

    it('lança ValidationError sem username', async () => {
      await expect(sendInvite(user.id, {})).rejects.toThrow(ValidationError)
    })

    it('lança NotFoundError para username inexistente', async () => {
      await expect(sendInvite(user.id, { username: 'fantasma' })).rejects.toThrow(NotFoundError)
    })

    it('lança NotFoundError quando o alvo não tem perfil', async () => {
      await createUser({ username: 'semperfil' })
      await expect(sendInvite(user.id, { username: 'semperfil' })).rejects.toThrow(NotFoundError)
    })

    it('lança ValidationError ao convidar a si mesmo', async () => {
      await expect(sendInvite(user.id, { username: 'testuser' })).rejects.toThrow(ValidationError)
    })

    it('lança ConflictError quando já são amigos', async () => {
      await createFriendship(profile.id, amigoPerfil.id)
      await expect(sendInvite(user.id, { username: 'amigo' })).rejects.toThrow(ConflictError)
    })

    it('lança ConflictError quando convite já foi enviado', async () => {
      await sendInvite(user.id, { username: 'amigo' })
      await expect(sendInvite(user.id, { username: 'amigo' })).rejects.toThrow(ConflictError)
    })

    it('lança ConflictError com code quando o alvo já convidou o remetente', async () => {
      await createFriendship(amigoPerfil.id, profile.id, { status: 'PENDING' })
      const err = await sendInvite(user.id, { username: 'amigo' }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictError)
      expect(err.code).toBe('INVITE_ALREADY_RECEIVED')
    })
  })

  describe('listFriends', () => {
    it('separa aceitos, pendentes recebidos e pendentes enviados', async () => {
      const terceiro       = await createUser({ username: 'terceiro' })
      const terceiroPerfil = await createProfile(terceiro.id)
      const quarto         = await createUser({ username: 'quarto' })
      const quartoPerfil   = await createProfile(quarto.id)

      await createFriendship(profile.id, amigoPerfil.id)
      await createFriendship(terceiroPerfil.id, profile.id, { status: 'PENDING' })
      await createFriendship(profile.id, quartoPerfil.id, { status: 'PENDING' })

      const result = await listFriends(user.id)
      expect(result.friends).toHaveLength(1)
      expect(result.friends[0].profile.username).toBe('amigo')
      expect(result.pendingReceived).toHaveLength(1)
      expect(result.pendingReceived[0].profile.username).toBe('terceiro')
      expect(result.pendingSent).toHaveLength(1)
      expect(result.pendingSent[0].profile.username).toBe('quarto')
    })

    it('devolve o OUTRO perfil independente da direção da amizade', async () => {
      await createFriendship(amigoPerfil.id, profile.id)
      const result = await listFriends(user.id)
      expect(result.friends[0].profile.id).toBe(amigoPerfil.id)
    })

    it('inclui movieCount no perfil do amigo aceito', async () => {
      await createFriendship(profile.id, amigoPerfil.id)
      await createMovie(amigoPerfil.id, { title: 'A' })
      await createMovie(amigoPerfil.id, { title: 'B' })
      const result = await listFriends(user.id)
      expect(result.friends[0].profile.movieCount).toBe(2)
    })

    it('NÃO expõe movieCount enquanto o convite está pendente', async () => {
      await createMovie(amigoPerfil.id, { title: 'A' })
      const invite = await sendInvite(user.id, { username: 'amigo' })
      expect(invite.profile.movieCount).toBeUndefined()

      const doRemetente = await listFriends(user.id)
      expect(doRemetente.pendingSent[0].profile.movieCount).toBeUndefined()

      const doConvidado = await listFriends(amigo.id)
      expect(doConvidado.pendingReceived[0].profile.movieCount).toBeUndefined()
    })
  })

  describe('respondInvite', () => {
    it('aceitar marca ACCEPTED com acceptedAt', async () => {
      const f = await createFriendship(amigoPerfil.id, profile.id, { status: 'PENDING' })
      const result = await respondInvite(user.id, f.id, true)
      expect(result.status).toBe('ACCEPTED')
      expect(result.acceptedAt).toBeInstanceOf(Date)
      expect(result.profile.id).toBe(amigoPerfil.id)
    })

    it('recusar deleta o convite', async () => {
      const f = await createFriendship(amigoPerfil.id, profile.id, { status: 'PENDING' })
      const result = await respondInvite(user.id, f.id, false)
      expect(result).toBeNull()
      expect(await prisma.friendship.findUnique({ where: { id: f.id } })).toBeNull()
    })

    it('aceitar remove convite cruzado pendente na direção inversa', async () => {
      const recebido = await createFriendship(amigoPerfil.id, profile.id, { status: 'PENDING' })
      const cruzado  = await createFriendship(profile.id, amigoPerfil.id, { status: 'PENDING' })

      await respondInvite(user.id, recebido.id, true)
      expect(await prisma.friendship.findUnique({ where: { id: cruzado.id } })).toBeNull()
    })

    it('lança ValidationError quando accept não é booleano', async () => {
      const f = await createFriendship(amigoPerfil.id, profile.id, { status: 'PENDING' })
      await expect(respondInvite(user.id, f.id, 'sim')).rejects.toThrow(ValidationError)
    })

    it('lança NotFoundError quando o convite é para outra pessoa', async () => {
      const f = await createFriendship(profile.id, amigoPerfil.id, { status: 'PENDING' })
      await expect(respondInvite(user.id, f.id, true)).rejects.toThrow(NotFoundError)
    })

    it('lança NotFoundError quando a amizade já foi aceita', async () => {
      const f = await createFriendship(amigoPerfil.id, profile.id)
      await expect(respondInvite(user.id, f.id, true)).rejects.toThrow(NotFoundError)
    })
  })

  describe('removeFriendship', () => {
    it('qualquer um dos dois lados pode desfazer', async () => {
      const f = await createFriendship(amigoPerfil.id, profile.id)
      await removeFriendship(user.id, f.id)
      expect(await prisma.friendship.findUnique({ where: { id: f.id } })).toBeNull()
    })

    it('requester pode cancelar convite pendente enviado', async () => {
      const f = await createFriendship(profile.id, amigoPerfil.id, { status: 'PENDING' })
      await removeFriendship(user.id, f.id)
      expect(await prisma.friendship.findUnique({ where: { id: f.id } })).toBeNull()
    })

    it('lança NotFoundError para amizade de terceiros', async () => {
      const terceiro       = await createUser({ username: 'terceiro' })
      const terceiroPerfil = await createProfile(terceiro.id)
      const f = await createFriendship(amigoPerfil.id, terceiroPerfil.id)
      await expect(removeFriendship(user.id, f.id)).rejects.toThrow(NotFoundError)
    })
  })

  describe('requireAcceptedFriendIds', () => {
    it('devolve [] para friendIds ausente ou vazio', async () => {
      expect(await requireAcceptedFriendIds(profile.id, undefined)).toEqual([])
      expect(await requireAcceptedFriendIds(profile.id, [])).toEqual([])
    })

    it('ignora o próprio id e valores não-string', async () => {
      expect(await requireAcceptedFriendIds(profile.id, [profile.id, 42, ''])).toEqual([])
    })

    it('devolve os ids quando todos são amigos aceitos (qualquer direção)', async () => {
      await createFriendship(amigoPerfil.id, profile.id)
      const result = await requireAcceptedFriendIds(profile.id, [amigoPerfil.id, amigoPerfil.id])
      expect(result).toEqual([amigoPerfil.id])
    })

    it('lança ForbiddenError quando algum id não é amigo aceito', async () => {
      await createFriendship(profile.id, amigoPerfil.id, { status: 'PENDING' })
      await expect(requireAcceptedFriendIds(profile.id, [amigoPerfil.id]))
        .rejects.toThrow(ForbiddenError)
    })
  })
})
