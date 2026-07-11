import { FriendshipStatus } from '@prisma/client'
import { prisma } from '../config/database.js'
import { requireUserProfile } from '../lib/profileHelpers.js'
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../lib/httpErrors.js'

const FRIEND_PROFILE_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  user: { select: { username: true } },
  _count: { select: { movies: true } },
}

const toFriendProfile = (profile) => ({
  id: profile.id,
  name: profile.name,
  avatarUrl: profile.avatarUrl,
  username: profile.user.username,
})

const toFriendshipView = (friendship, otherProfile) => ({
  id: friendship.id,
  status: friendship.status,
  createdAt: friendship.createdAt,
  acceptedAt: friendship.acceptedAt,
  profile: {
    ...toFriendProfile(otherProfile),
    // movieCount só pós-aceite: convite não pode virar sonda do tamanho da lista alheia.
    ...(friendship.status === FriendshipStatus.ACCEPTED && {
      movieCount: otherProfile._count.movies,
    }),
  },
})

const findBetween = (profileIdA, profileIdB) =>
  prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: profileIdA, addresseeId: profileIdB },
        { requesterId: profileIdB, addresseeId: profileIdA },
      ],
    },
  })

export const sendInvite = async (userId, { username } = {}) => {
  if (typeof username !== 'string' || !username.trim()) {
    throw new ValidationError('Username é obrigatório')
  }
  const profile = await requireUserProfile(userId)

  const trimmed = username.trim()
  // Match exato primeiro: se existirem contas que só diferem por caixa,
  // o lookup insensitive sozinho devolveria uma arbitrária.
  const target =
    await prisma.user.findUnique({
      where: { username: trimmed },
      select: { profile: { select: FRIEND_PROFILE_SELECT } },
    }) ??
    await prisma.user.findFirst({
      where: { username: { equals: trimmed, mode: 'insensitive' } },
      select: { profile: { select: FRIEND_PROFILE_SELECT } },
    })
  if (!target?.profile) {
    throw new NotFoundError('Usuário não encontrado')
  }
  if (target.profile.id === profile.id) {
    throw new ValidationError('Você não pode adicionar a si mesmo')
  }

  const existing = await findBetween(profile.id, target.profile.id)
  if (existing) {
    if (existing.status === FriendshipStatus.ACCEPTED) {
      throw new ConflictError('Vocês já são amigos')
    }
    if (existing.addresseeId === profile.id) {
      throw new ConflictError('Esse usuário já te convidou — responda o convite pendente', {
        code: 'INVITE_ALREADY_RECEIVED',
      })
    }
    throw new ConflictError('Convite já enviado')
  }

  try {
    const friendship = await prisma.friendship.create({
      data: { requesterId: profile.id, addresseeId: target.profile.id },
    })
    return toFriendshipView(friendship, target.profile)
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictError('Convite já enviado')
    }
    throw err
  }
}

export const listFriends = async (userId) => {
  const profile = await requireUserProfile(userId)
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] },
    include: {
      requester: { select: FRIEND_PROFILE_SELECT },
      addressee: { select: FRIEND_PROFILE_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  })

  const view = (f) =>
    toFriendshipView(f, f.requesterId === profile.id ? f.addressee : f.requester)

  return {
    friends: friendships
      .filter((f) => f.status === FriendshipStatus.ACCEPTED)
      .map(view),
    pendingReceived: friendships
      .filter((f) => f.status === FriendshipStatus.PENDING && f.addresseeId === profile.id)
      .map(view),
    pendingSent: friendships
      .filter((f) => f.status === FriendshipStatus.PENDING && f.requesterId === profile.id)
      .map(view),
  }
}

export const countPendingInvites = async (userId) => {
  // 0 em vez de 404 sem profile: badge não pode quebrar pré-onboarding.
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) return 0
  return prisma.friendship.count({
    where: { addresseeId: profile.id, status: FriendshipStatus.PENDING },
  })
}

export const respondInvite = async (userId, friendshipId, accept) => {
  if (typeof accept !== 'boolean') {
    throw new ValidationError('accept deve ser booleano')
  }
  const profile = await requireUserProfile(userId)
  const friendship = await prisma.friendship.findFirst({
    where: { id: friendshipId, addresseeId: profile.id, status: FriendshipStatus.PENDING },
  })
  if (!friendship) {
    throw new NotFoundError('Convite não encontrado')
  }

  if (!accept) {
    await prisma.friendship.delete({ where: { id: friendship.id } })
    return null
  }

  const [updated] = await prisma.$transaction([
    prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: FriendshipStatus.ACCEPTED, acceptedAt: new Date() },
      include: { requester: { select: FRIEND_PROFILE_SELECT } },
    }),
    // Convite cruzado criado em corrida (B→A enquanto A→B pendente) viraria
    // duplicata órfã ao aceitar — o unique não cobre a direção inversa.
    prisma.friendship.deleteMany({
      where: { requesterId: profile.id, addresseeId: friendship.requesterId },
    }),
  ])
  return toFriendshipView(updated, updated.requester)
}

export const removeFriendship = async (userId, friendshipId) => {
  const profile = await requireUserProfile(userId)
  const friendship = await prisma.friendship.findFirst({
    where: {
      id: friendshipId,
      OR: [{ requesterId: profile.id }, { addresseeId: profile.id }],
    },
  })
  if (!friendship) {
    throw new NotFoundError('Amizade não encontrada')
  }
  await prisma.friendship.delete({ where: { id: friendship.id } })
}

export const requireAcceptedFriendIds = async (profileId, friendIds) => {
  if (!Array.isArray(friendIds) || friendIds.length === 0) return []

  const ids = [...new Set(
    friendIds.filter((id) => typeof id === 'string' && id.trim() && id !== profileId)
  )]
  if (ids.length === 0) return []

  const friendships = await prisma.friendship.findMany({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [
        { requesterId: profileId, addresseeId: { in: ids } },
        { addresseeId: profileId, requesterId: { in: ids } },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  })
  const acceptedIds = new Set(
    friendships.map((f) => (f.requesterId === profileId ? f.addresseeId : f.requesterId))
  )
  if (acceptedIds.size !== ids.length) {
    throw new ForbiddenError('Só é possível sortear com amigos que aceitaram o convite')
  }
  return ids
}
