/**
 * Gêneros virtuais: aparecem como gênero normal pro frontend, mas no
 * provider externo viram uma combinação de filtros reais. Hoje só "Anime"
 * (Animation + origem JP no TMDB), mas serve de extensão pra qualquer
 * recorte que o TMDB não exponha como gênero próprio.
 */

const VIRTUAL_GENRES = {
  Anime: {
    tmdbGenreId: 16,
    tmdbOriginCountry: 'JP',
  },
}

export const VIRTUAL_GENRE_NAMES = Object.keys(VIRTUAL_GENRES)

export const isVirtualGenre = (name) =>
  typeof name === 'string' && Object.prototype.hasOwnProperty.call(VIRTUAL_GENRES, name)

/**
 * Separa gêneros virtuais dos reais e devolve os filtros extras do TMDB
 * que os virtuais ativam (genre id + origin country).
 */
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
