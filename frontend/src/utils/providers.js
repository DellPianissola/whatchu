// Tags de afiliado por programa. Não são segredos — aparecem na URL pública —
// então tudo bem viverem no frontend.
const AMAZON_AFFILIATE_TAG = 'whatchu-20'

const PRIME_VIDEO_URL = `https://www.primevideo.com/?tag=${AMAZON_AFFILIATE_TAG}`

// Mapa de provider_id (TMDB/JustWatch) → URL da homepage do serviço.
// TMDB/JustWatch não expõe deep link por título, então caímos sempre na home.
// IDs estáveis verificáveis em /watch/providers/movie?watch_region=BR.
const PROVIDER_URLS = {
  // Amazon Prime Video — afiliado ativo
  9:    PRIME_VIDEO_URL,
  10:   PRIME_VIDEO_URL,
  119:  PRIME_VIDEO_URL,
  // Netflix
  8:    'https://www.netflix.com',
  1796: 'https://www.netflix.com',
  // Disney+
  337:  'https://www.disneyplus.com',
  // Max (ex-HBO Max)
  1899: 'https://www.max.com',
  384:  'https://www.max.com',
  // Apple TV / Apple TV+
  2:    'https://tv.apple.com',
  350:  'https://tv.apple.com',
  // Paramount+
  531:  'https://www.paramountplus.com',
  // Globoplay
  167:  'https://globoplay.globo.com',
  // Crunchyroll
  283:  'https://www.crunchyroll.com',
  // Looke
  47:   'https://www.looke.com.br',
  // Telecine
  227:  'https://www.telecineplay.com.br',
  // Star+ (migrado pro Disney+, mantido por compatibilidade de dados antigos)
  619:  'https://www.disneyplus.com',
}

export const providerUrl = (providerId) => PROVIDER_URLS[providerId] || null
