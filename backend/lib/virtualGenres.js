const VIRTUAL_GENRES = {
  Anime: {
    tmdbGenreId: 16,
    tmdbOriginCountry: 'JP',
  },
}

export const VIRTUAL_GENRE_NAMES = Object.keys(VIRTUAL_GENRES)

export const isVirtualGenre = (name) =>
  typeof name === 'string' && Object.prototype.hasOwnProperty.call(VIRTUAL_GENRES, name)

export const extractVirtualGenres = (genres = []) => {
  const real = []
  const extraGenreIds = []
  const originCountries = new Set()

  for (const name of genres) {
    if (isVirtualGenre(name)) {
      const cfg = VIRTUAL_GENRES[name]
      if (cfg.tmdbGenreId) extraGenreIds.push(cfg.tmdbGenreId)
      if (cfg.tmdbOriginCountry) originCountries.add(cfg.tmdbOriginCountry)
    } else {
      real.push(name)
    }
  }

  return {
    realGenres: real,
    extraTmdbGenreIds: extraGenreIds,
    tmdbOriginCountries: [...originCountries],
  }
}
