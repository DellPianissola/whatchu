import { createMovie, updateMovie, deleteMovie } from './api'

const DEFAULT_PRIORITY = 'MEDIUM'

export const buildMoviePayload = (externalItem, priority = DEFAULT_PRIORITY) => ({
  title:       externalItem.title,
  type:        String(externalItem.type).toUpperCase(),
  description: externalItem.description ?? null,
  poster:      externalItem.poster ?? null,
  year:        externalItem.year ?? null,
  duration:    externalItem.duration ?? null,
  genres:      externalItem.genres ?? [],
  rating:      externalItem.rating ?? null,
  externalId:  externalItem.externalId ?? null,
  priority,
})

export const findUserMovie = (userMovies, item) => {
  if (!item) return null
  const type = String(item.type).toUpperCase()
  const externalId = item.externalId
  // IDs do TMDB colidem entre movie e tv — sem o type, um filme casaria com a série homônima.
  if (externalId) {
    const byExternal = userMovies.find((m) => m.externalId === externalId && m.type === type)
    if (byExternal) return byExternal
  }
  return userMovies.find((m) => m.title === item.title && m.type === type) || null
}

export const addUserMovie = (externalItem, priority = DEFAULT_PRIORITY) =>
  createMovie(buildMoviePayload(externalItem, priority))

export const removeUserMovie = (id) => deleteMovie(id)

export const changeUserMoviePriority = (id, priority) =>
  updateMovie(id, { priority })

export const toggleUserMovieWatched = (movie) =>
  updateMovie(movie.id, { watched: !movie.watched })

export const setUserMovieProgress = (id, pointer, watched) =>
  updateMovie(id, {
    lastSeason:  pointer?.season ?? null,
    lastEpisode: pointer?.episode ?? null,
    watched,
  })
