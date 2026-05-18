const AMAZON_AFFILIATE_TAG = 'whatchu-20'
const PRIME_VIDEO_URL = `https://www.primevideo.com/?tag=${AMAZON_AFFILIATE_TAG}`

const URL_BY_ID = {
  9:    PRIME_VIDEO_URL,
  10:   PRIME_VIDEO_URL,
  119:  PRIME_VIDEO_URL,
  8:    'https://www.netflix.com',
  1796: 'https://www.netflix.com',
  337:  'https://www.disneyplus.com',
  1899: 'https://www.max.com',
  384:  'https://www.max.com',
  2:    'https://tv.apple.com',
  350:  'https://tv.apple.com',
  531:  'https://www.paramountplus.com',
  167:  'https://globoplay.globo.com',
  283:  'https://www.crunchyroll.com',
  47:   'https://www.looke.com.br',
  227:  'https://www.telecineplay.com.br',
  619:  'https://www.disneyplus.com',
}

const URL_BY_NAME = {
  'amazon prime video':          PRIME_VIDEO_URL,
  'amazon video':                PRIME_VIDEO_URL,
  'amazon prime video with ads': PRIME_VIDEO_URL,
  'prime video with ads':        PRIME_VIDEO_URL,
  'netflix':                     'https://www.netflix.com',
  'netflix standard with ads':   'https://www.netflix.com',
  'disney plus':                 'https://www.disneyplus.com',
  'disney+':                     'https://www.disneyplus.com',
  'max':                         'https://www.max.com',
  'hbo max':                     'https://www.max.com',
  'apple tv':                    'https://tv.apple.com',
  'apple tv plus':               'https://tv.apple.com',
  'apple tv+':                   'https://tv.apple.com',
  'paramount plus':              'https://www.paramountplus.com',
  'paramount+':                  'https://www.paramountplus.com',
  'globoplay':                   'https://globoplay.globo.com',
  'crunchyroll':                 'https://www.crunchyroll.com',
  'looke':                       'https://www.looke.com.br',
  'telecine':                    'https://www.telecineplay.com.br',
  'telecine play':               'https://www.telecineplay.com.br',
  'mercado play':                'https://www.mercadolivre.com.br/play',
  'mercado livre':               'https://www.mercadolivre.com.br/play',
  'claro tv+':                   'https://www.clarotvmais.com.br',
  'claro tv':                    'https://www.clarotvmais.com.br',
  'claro video':                 'https://www.clarovideo.com',
  'universal+':                  'https://www.universalplus.com',
  'universal plus':              'https://www.universalplus.com',
  'universal':                   'https://www.universalplus.com',
  'nbcuniversal':                'https://www.universalplus.com',
  'universal pictures':          'https://www.universalplus.com',
}

export const providerUrl = (provider) => {
  if (!provider) return null
  const byId = URL_BY_ID[provider.id]
  if (byId) return byId
  const key = String(provider.name || '').toLowerCase().trim()
  // Amazon Channels (Universal+/HBO/AMC+/etc) são add-ons do Prime Video
  if (key.includes('amazon channel')) return PRIME_VIDEO_URL
  return URL_BY_NAME[key] || null
}
