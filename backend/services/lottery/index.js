import { prisma } from '../../config/database.js'
import { buildWhere } from './filters.js'
import { computeWeight } from './weights.js'
import { weightedPick } from './picker.js'
import { DEFAULT_LOTTERY_CONFIG } from './config.js'
import { INCLUDE_ADDED_BY } from '../../lib/prismaIncludes.js'

const fetchEligibleMovies = (profileId, filters) =>
  prisma.movie.findMany({
    where: buildWhere(profileId, filters),
    include: INCLUDE_ADDED_BY,
  })

const countAllMovies = (profileId) =>
  prisma.movie.count({ where: { addedById: profileId } })

/**
 * @returns {Promise<{ movie: object|null, reason?: 'EMPTY_LIST'|'NO_MATCH' }>}
 */
export const drawMovie = async (profileId, filters = {}, config = DEFAULT_LOTTERY_CONFIG) => {
  const eligible = await fetchEligibleMovies(profileId, filters)
  if (eligible.length > 0) {
    const now   = Date.now()
    const movie = weightedPick(eligible, (m) => computeWeight(m, config, now))
    return { movie }
  }

  const total = await countAllMovies(profileId)
  return { movie: null, reason: total === 0 ? 'EMPTY_LIST' : 'NO_MATCH' }
}
