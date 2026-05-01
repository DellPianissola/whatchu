// Config default das strategies de peso do sorteio.
//
// Cada strategy tem `enabled` + parâmetros próprios. Setar `enabled: false`
// neutraliza a strategy (peso = 1, multiplicação identidade) sem mexer em
// código nenhum — é o "interruptor".
//
// FUTURO: o `drawMovie` aceita um terceiro arg `config` opcional. Quando o
// painel de configuração do usuário existir, o caller passa a config dele
// (mergeada com este default) e cada perfil decide o que liga/desliga.

export const DEFAULT_LOTTERY_CONFIG = {
  priority: {
    enabled: true,
    // Pesos exponenciais base 4 — URGENT 64x mais provável que LOW.
    weights: { LOW: 1, MEDIUM: 4, HIGH: 16, URGENT: 64 },
  },
  age: {
    enabled: true,
    // Boost linear capado, aplicado SÓ em não-assistidos:
    //   0 mês  → 1x
    //   12 mês → 2x
    //   24+ mês → 3x (cap)
    // Setar enabled:false ou maxBoost:1 desliga.
    maxBoost: 3,
    fullMonths: 24,
  },
}
