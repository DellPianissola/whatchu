import { prisma } from '../../config/database.js'
import { buildWhere } from './filters.js'
import { computeGroupWeight } from './weights.js'
import { mergeByIdentity } from './merge.js'
import { weightedPick } from './picker.js'
import { DEFAULT_LOTTERY_CONFIG } from './config.js'
import { INCLUDE_ADDED_BY } from '../../lib/prismaIncludes.js'

const fetchEligibleMovies = (profileIds, filters) =>
  prisma.movie.findMany({
    where: buildWhere(profileIds, filters),
    include: INCLUDE_ADDED_BY,
  })

const countAllMovies = (profileIds) =>
  prisma.movie.count({ where: { addedById: { in: profileIds } } })

const fetchNonSharingIds = async (profileIds) => {
  const profiles = await prisma.profile.findMany({
    where: { id: { in: profileIds }, shareListWithFriends: false },
    select: { id: true },
  })
  return new Set(profiles.map((p) => p.id))
}

// Item exclusivo de um amigo que bloqueou a lista fica fora do pote;
// o dono do sorteio (primaryId) nunca é bloqueado no próprio sorteio.
const isPrivateExclusive = (group, primaryId, nonSharing) =>
  group.copies.length === 1 &&
  group.copies[0].addedById !== primaryId &&
  nonSharing.has(group.copies[0].addedById)

const buildPot = async (ids, filters) => {
  const eligible = await fetchEligibleMovies(ids, filters)
  let groups = mergeByIdentity(eligible, ids[0])

  if (ids.length > 1) {
    const nonSharing = await fetchNonSharingIds(ids.slice(1))
    if (nonSharing.size > 0) {
      groups = groups.filter((g) => !isPrivateExclusive(g, ids[0], nonSharing))
    }
    if (filters.onlyCommon) {
      groups = groups.filter((g) => g.copies.length > 1)
    }
  }

  return groups
}

const toSource = (movie) => ({
  profileId: movie.addedBy.id,
  name: movie.addedBy.name,
  avatarUrl: movie.addedBy.avatarUrl,
  priority: movie.priority,
  watched: movie.watched,
})

const normalizeIds = (profileIds) => [...new Set([].concat(profileIds))]

/**
 * @param {string|string[]} profileIds — o primeiro é o perfil de quem sorteia;
 *   quando há empate de cópias, a dele é a exibida.
 * @returns {Promise<{ movie: object|null, sources?: object[], reason?: 'EMPTY_LIST'|'NO_MATCH' }>}
 */
export const drawMovie = async (profileIds, filters = {}, config = DEFAULT_LOTTERY_CONFIG) => {
  const ids = normalizeIds(profileIds)
  const groups = await buildPot(ids, filters)
  if (groups.length > 0) {
    const now    = Date.now()
    const picked = weightedPick(groups, (g) => computeGroupWeight(g, config, now))
    return { movie: picked.movie, sources: picked.copies.map(toSource) }
  }

  const total = await countAllMovies(ids)
  return { movie: null, reason: total === 0 ? 'EMPTY_LIST' : 'NO_MATCH' }
}

export const previewPot = async (profileIds, filters = {}) => {
  const groups = await buildPot(normalizeIds(profileIds), filters)
  return {
    total: groups.length,
    common: groups.filter((g) => g.copies.length > 1).length,
  }
}
