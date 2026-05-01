// Strategies de peso pro sorteio.
//
// Cada strategy é uma função pura (movie, config, now) → multiplicador (number).
// Quando a strategy está desabilitada na config, devolve 1 — neutro no produto,
// efetivamente "ignorada" sem precisar tirar do pipeline.
//
// Como adicionar uma nova strategy (ex: bonus por rating, penalidade por já-assistido):
//   1. Criar a função aqui, no padrão (movie, config, now) => number.
//   2. Adicionar a chave correspondente em DEFAULT_LOTTERY_CONFIG (config.js).
//   3. Registrar em STRATEGIES abaixo com o nome da chave.

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30

// ─── Strategies ─────────────────────────────────────────────────────────────

// Peso por prioridade (LOW/MEDIUM/HIGH/URGENT).
export const priorityStrategy = (movie, config) => {
  if (!config?.enabled) return 1
  return config.weights[movie.priority] ?? 1
}

// Boost por idade — itens não-assistidos antigos ganham peso pra não ficarem
// esquecidos. Já assistidos não recebem (não precisam ser "lembrados").
// Linear capado entre [1, maxBoost].
export const ageStrategy = (movie, config, now) => {
  if (!config?.enabled || movie.watched) return 1
  const ageMonths = (now - new Date(movie.createdAt).getTime()) / MS_PER_MONTH
  const ratio     = Math.min(ageMonths, config.fullMonths) / config.fullMonths
  return 1 + ratio * (config.maxBoost - 1)
}

// ─── Composer ───────────────────────────────────────────────────────────────

// Registro central. Ordem é irrelevante (multiplicação é comutativa).
const STRATEGIES = [
  { fn: priorityStrategy, key: 'priority' },
  { fn: ageStrategy,      key: 'age'      },
]

// Combina todas as strategies registradas num peso único (produto).
export const computeWeight = (movie, config, now) =>
  STRATEGIES.reduce((acc, { fn, key }) => acc * fn(movie, config[key], now), 1)
