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
  const externalId = item.externalId
  if (externalId) {
    const byExternal = userMovies.find((m) => m.externalId === externalId)
    if (byExternal) return byExternal
  }
  const type = String(item.type).toUpperCase()
  return userMovies.find((m) => m.title === item.title && m.type === type) || null
}

export const addUserMovie = (externalItem, priority = DEFAULT_PRIORITY) =>
  createMovie(buildMoviePayload(externalItem, priority))

export const removeUserMovie = (id) => deleteMovie(id)

export const changeUserMoviePriority = (id, priority) =>
  updateMovie(id, { priority })

export const toggleUserMovieWatched = (movie) =>
  updateMovie(movie.id, { watched: !movie.watched })
