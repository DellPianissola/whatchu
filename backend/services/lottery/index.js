// Entry point do módulo de sorteio. Orquestra: query → pesos → escolha.
//
// Responsabilidades fora daqui:
//   - filters.js  → traduz filtros da UI em where do Prisma
//   - weights.js  → strategies de peso (priority, age, futuras)
//   - picker.js   → algoritmo genérico de sorteio por peso
//   - config.js   → config default das strategies (futuro: by-user)

import { prisma } from '../../config/database.js'
import { buildWhere } from './filters.js'
import { computeWeight } from './weights.js'
import { weightedPick } from './picker.js'
import { DEFAULT_LOTTERY_CONFIG } from './config.js'

const INCLUDE_ADDED_BY = {
  addedBy: { select: { id: true, name: true } },
}

const fetchEligibleMovies = (profileId, filters) =>
  prisma.movie.findMany({
    where: buildWhere(profileId, filters),
    include: INCLUDE_ADDED_BY,
  })

// Conta itens do perfil ignorando filtros — usado pra distinguir
// "lista vazia" (EMPTY_LIST) de "filtros não casaram" (NO_MATCH).
const countAllMovies = (profileId) =>
  prisma.movie.count({ where: { addedById: profileId } })

/**
 * Sorteia um item da lista do perfil.
 *
 * @param {string} profileId
 * @param {object} [filters] - { types?, genres?, priorities?, ignoreWatched? }
 * @param {object} [config]  - override da config de pesos. Default: DEFAULT_LOTTERY_CONFIG.
 *                             Permite injetar config por-perfil quando o painel
 *                             de configuração existir.
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
