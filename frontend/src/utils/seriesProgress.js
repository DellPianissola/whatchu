export const watchableSeasons = (seasonList) =>
  (seasonList ?? []).filter(s => s.number > 0)

export const watchedInSeason = (season, pointer) => {
  if (!pointer || season.number > pointer.season) return 0
  if (season.number < pointer.season) return season.episodeCount
  return Math.min(pointer.episode, season.episodeCount)
}

// Sem `last_episode_to_air` o TMDB não confirma estreia de nada — série anunciada
// não tem episódio disponível pra marcar.
export const airedInSeason = (season, lastAired) => {
  if (!lastAired || season.number > lastAired.season) return 0
  if (season.number < lastAired.season) return season.episodeCount
  return Math.min(season.episodeCount, lastAired.episode)
}

// Trava 1 e 99 nas pontas: em série longa o arredondamento mostraria 0% com episódio
// já assistido, ou 100% faltando episódio.
export const percentWatched = (watched, total) => {
  if (!total || !watched) return 0
  if (watched >= total) return 100
  return Math.min(99, Math.max(1, Math.round((watched / total) * 100)))
}

export const summarizeProgress = (seasons, pointer, lastAired) => {
  let aired = 0
  let watched = 0

  for (const season of seasons) {
    const airedHere = airedInSeason(season, lastAired)
    aired   += airedHere
    watched += Math.min(watchedInSeason(season, pointer), airedHere)
  }

  return { aired, watched, percent: percentWatched(watched, aired) }
}

export const isCaughtUp = ({ seasons, pointer, lastAired }) => {
  if (!pointer) return false
  const { watched, aired } = summarizeProgress(seasons, pointer, lastAired)
  return aired > 0 && watched >= aired
}

export const watchedCorrection = ({ movie, seasonList, lastAired }) => {
  if (!movie || movie.type !== 'SERIES') return null
  if (!movie.lastSeason || !movie.lastEpisode) return null

  const pointer = { season: movie.lastSeason, episode: movie.lastEpisode }
  const watched = isCaughtUp({
    seasons: watchableSeasons(seasonList),
    pointer,
    lastAired,
  })

  return watched === movie.watched ? null : { pointer, watched }
}
