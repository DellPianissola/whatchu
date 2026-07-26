import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext.jsx'
import { getMovies } from '../services/api'
import {
  addUserMovie,
  removeUserMovie,
  changeUserMoviePriority,
  toggleUserMovieWatched,
  setUserMovieProgress,
  findUserMovie,
} from '../services/userMovies'

const UserMoviesContext = createContext(null)

export const useUserMovies = () => {
  const ctx = useContext(UserMoviesContext)
  if (!ctx) {
    throw new Error('useUserMovies deve ser usado dentro de UserMoviesProvider')
  }
  return ctx
}

export const UserMoviesProvider = ({ children }) => {
  const { profile } = useAuth()
  const [userMovies, setUserMovies] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setUserMovies([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const movies = await getMovies()
      setUserMovies(movies || [])
    } catch (err) {
      setError(err)
      setUserMovies([])
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id])

  useEffect(() => { refresh() }, [refresh])

  const addToList = useCallback(async (externalItem, priority) => {
    const movie = await addUserMovie(externalItem, priority)
    setUserMovies((prev) => [...prev, movie])
    return movie
  }, [])

  const removeFromList = useCallback(async (id) => {
    await removeUserMovie(id)
    setUserMovies((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const changePriority = useCallback(async (id, priority) => {
    await changeUserMoviePriority(id, priority)
    setUserMovies((prev) => prev.map((m) => m.id === id ? { ...m, priority } : m))
  }, [])

  const toggleWatched = useCallback(async (movie) => {
    const updated = await toggleUserMovieWatched(movie)
    setUserMovies((prev) => prev.map((m) => m.id === movie.id ? { ...m, watched: updated.watched } : m))
    return updated
  }, [])

  // Otimista e sem mesclar a resposta: cliques rápidos em chips vizinhos disparam
  // PUTs concorrentes, e aplicar o que responder por último gravaria na tela um
  // episódio diferente do que foi clicado.
  const setProgress = useCallback(async (movie, pointer, watched) => {
    const patch = {
      lastSeason:  pointer?.season ?? null,
      lastEpisode: pointer?.episode ?? null,
      watched,
    }
    const previous = {
      lastSeason:  movie.lastSeason ?? null,
      lastEpisode: movie.lastEpisode ?? null,
      watched:     movie.watched,
    }

    setUserMovies((prev) => prev.map((m) => m.id === movie.id ? { ...m, ...patch } : m))
    try {
      await setUserMovieProgress(movie.id, pointer, watched)
    } catch (error) {
      setUserMovies((prev) => prev.map((m) => m.id === movie.id ? { ...m, ...previous } : m))
      throw error
    }
  }, [])

  const findByItem = useCallback((item) => findUserMovie(userMovies, item), [userMovies])

  const value = useMemo(() => ({
    userMovies,
    isLoading,
    error,
    refresh,
    addToList,
    removeFromList,
    changePriority,
    toggleWatched,
    setProgress,
    findByItem,
  }), [userMovies, isLoading, error, refresh, addToList, removeFromList, changePriority, toggleWatched, setProgress, findByItem])

  return (
    <UserMoviesContext.Provider value={value}>
      {children}
    </UserMoviesContext.Provider>
  )
}
