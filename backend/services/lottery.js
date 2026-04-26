import { prisma } from '../config/database.js'

const PRIORITY_WEIGHTS = {
  URGENT: 10,
  HIGH: 5,
  MEDIUM: 2,
  LOW: 1,
}

// Sorteia entre TODOS os filmes da lista (assistidos e não-assistidos).
// Futuro: respeitar uma preferência do usuário pra excluir assistidos (ver BACKLOG).
const fetchEligibleMovies = async (profileId) => {
  return prisma.movie.findMany({
    where: { addedById: profileId },
    include: {
      addedBy: { select: { id: true, name: true } },
    },
  })
}

const buildWeightedPool = (movies) => {
  const pool = []
  for (const movie of movies) {
    const weight = PRIORITY_WEIGHTS[movie.priority] || 1
    for (let i = 0; i < weight; i++) {
      pool.push(movie)
    }
  }
  return pool
}

const pickRandom = (pool) => {
  return pool[Math.floor(Math.random() * pool.length)]
}

export const drawMovie = async (profileId) => {
  const eligible = await fetchEligibleMovies(profileId)
  if (eligible.length === 0) return null

  const pool = buildWeightedPool(eligible)
  return pickRandom(pool)
}
