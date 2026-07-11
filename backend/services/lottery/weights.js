// Strategies de peso. Cada uma: (movie, config, now) => multiplicador.
// Quando desabilitada, devolve 1 (neutro no produto).
//
// Pra adicionar nova: definir a função, registrar em STRATEGIES, adicionar
// chave correspondente em DEFAULT_LOTTERY_CONFIG.

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30

export const priorityStrategy = (movie, config) => {
  if (!config?.enabled) return 1
  return config.weights[movie.priority] ?? 1
}

export const ageStrategy = (movie, config, now) => {
  if (!config?.enabled || movie.watched) return 1
  const ageMonths = (now - new Date(movie.createdAt).getTime()) / MS_PER_MONTH
  const ratio     = Math.min(ageMonths, config.fullMonths) / config.fullMonths
  return 1 + ratio * (config.maxBoost - 1)
}

const STRATEGIES = [
  { fn: priorityStrategy, key: 'priority' },
  { fn: ageStrategy,      key: 'age'      },
]

export const computeWeight = (movie, config, now) =>
  STRATEGIES.reduce((acc, { fn, key }) => acc * fn(movie, config[key], now), 1)

export const overlapStrategy = (group, config) => {
  if (!config?.enabled) return 1
  return config.boostPerExtraList ** (group.copies.length - 1)
}

export const computeGroupWeight = (group, config, now) =>
  group.copies.reduce((sum, movie) => sum + computeWeight(movie, config, now), 0)
    * overlapStrategy(group, config.overlap)
