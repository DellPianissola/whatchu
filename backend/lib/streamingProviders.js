export const STREAMING_PROVIDERS = [
  { key: 'netflix',     name: 'Netflix',     tmdbIds: [8, 1796] },
  { key: 'prime',       name: 'Prime Video', tmdbIds: [9, 10, 119, 2100] },
  { key: 'max',         name: 'Max',         tmdbIds: [384, 1899, 1825] },
  { key: 'disney',      name: 'Disney+',     tmdbIds: [337, 619] },
  { key: 'appletv',     name: 'Apple TV+',   tmdbIds: [350] },
  { key: 'paramount',   name: 'Paramount+',  tmdbIds: [531, 582, 2303] },
  { key: 'globoplay',   name: 'Globoplay',   tmdbIds: [307] },
  { key: 'crunchyroll', name: 'Crunchyroll', tmdbIds: [283, 1968] },
]

const KEY_TO_PROVIDER = new Map(STREAMING_PROVIDERS.map(p => [p.key, p]))

export const STREAMING_PROVIDER_KEYS = STREAMING_PROVIDERS.map(p => p.key)

export const resolveTmdbIds = (keys) => {
  if (!Array.isArray(keys) || keys.length === 0) return []
  const ids = new Set()
  for (const key of keys) {
    const provider = KEY_TO_PROVIDER.get(key)
    if (provider) for (const id of provider.tmdbIds) ids.add(id)
  }
  return [...ids]
}

export const publicStreamingProviders = () =>
  STREAMING_PROVIDERS.map(({ key, name }) => ({ key, name }))

export const extractStreamingProviderIds = (watchProviders) => {
  if (!watchProviders?.streaming) return []
  return watchProviders.streaming.map(p => p.id).filter(Number.isInteger)
}
