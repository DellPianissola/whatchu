// Default das strategies. `enabled: false` em qualquer strategy = peso 1 (neutro).
// drawMovie aceita config como 3º arg → futuro painel by-user injeta a do perfil.

export const DEFAULT_LOTTERY_CONFIG = {
  priority: {
    enabled: true,
    weights: { LOW: 1, MEDIUM: 4, HIGH: 16, URGENT: 64 },
  },
  age: {
    // Boost só em não-assistidos: 0 mês = 1x, 12 mês = 2x, 24+ mês = 3x.
    enabled: true,
    maxBoost: 3,
    fullMonths: 24,
  },
  overlap: {
    // Sorteio com amigos: item presente em N listas ganha boost^(N-1),
    // além da soma natural dos pesos das cópias.
    enabled: true,
    boostPerExtraList: 4,
  },
}
