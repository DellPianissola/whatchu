/**
 * Mapa de classificação etária por região. O valor da rating vem cru do TMDB
 * (já específico da região), aqui só decidimos a "intensidade" pra cor.
 *
 * Pra adicionar uma região nova: somar uma entrada com a escala local. O modal
 * lê `region` do payload do backend e cai no mapa correspondente.
 */
const TIER_BY_REGION = {
  BR: {
    L:    1,
    '10': 2,
    '12': 3,
    '14': 4,
    '16': 5,
    '18': 6,
  },
}

export const ageRatingTier = (rating) => {
  if (!rating?.region || !rating?.value) return 0
  return TIER_BY_REGION[rating.region]?.[rating.value] ?? 0
}
