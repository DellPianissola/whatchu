// Sorteio aleatório por peso cumulativo (weighted random sampling).
//
// Algoritmo:
//   1. Calcula o peso de cada item via `weightFn`.
//   2. Soma o total.
//   3. Sorteia r uniformemente em [0, total) e percorre subtraindo até cair
//      no escolhido. O item cuja "fatia" contém r é o vencedor.
//
// Complexidade: O(n) tempo, O(n) memória (array de pesos). Aceita pesos
// fracionários — necessário pro boost de idade que usa multiplicadores tipo 1.5.
//
// Domínio-agnóstico: não sabe nada de filme/prioridade/etc. Recebe items + fn.

export const weightedPick = (items, weightFn) => {
  if (items.length === 0) return null
  if (items.length === 1) return items[0]

  const weights = items.map(weightFn)
  const total   = weights.reduce((s, w) => s + w, 0)

  // Edge case: todos os pesos zerados (config patológica). Cai pra uniforme
  // em vez de explodir, pra não bloquear o sorteio.
  if (total <= 0) return items[Math.floor(Math.random() * items.length)]

  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }

  // Fallback p/ erro de arredondamento de ponto flutuante (raríssimo).
  return items[items.length - 1]
}
