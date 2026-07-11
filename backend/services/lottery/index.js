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

const toSource = (movie) => ({
  profileId: movie.addedBy.id,
  name: movie.addedBy.name,
  avatarUrl: movie.addedBy.avatarUrl,
  priority: movie.priority,
  watched: movie.watched,
})

/**
 * @param {string|string[]} profileIds — o primeiro é o perfil de quem sorteia;
 *   quando há empate de cópias, a dele é a exibida.
 * @returns {Promise<{ movie: object|null, sources?: object[], reason?: 'EMPTY_LIST'|'NO_MATCH' }>}
 */
export const drawMovie = async (profileIds, filters = {}, config = DEFAULT_LOTTERY_CONFIG) => {
  const ids = [...new Set([].concat(profileIds))]
  const eligible = await fetchEligibleMovies(ids, filters)
  if (eligible.length > 0) {
    const now    = Date.now()
    const groups = mergeByIdentity(eligible, ids[0])
    const picked = weightedPick(groups, (g) => computeGroupWeight(g, config, now))
    return { movie: picked.movie, sources: picked.copies.map(toSource) }
  }

  const total = await countAllMovies(ids)
  return { movie: null, reason: total === 0 ? 'EMPTY_LIST' : 'NO_MATCH' }
}
