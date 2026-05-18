import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext.jsx'
import { getMovies } from '../services/api'
import {
  addUserMovie,
  removeUserMovie,
  changeUserMoviePriority,
  toggleUserMovieWatched,
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
      const response = await getMovies()
      setUserMovies(response.data.movies || [])
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
    findByItem,
  }), [userMovies, isLoading, error, refresh, addToList, removeFromList, changePriority, toggleWatched, findByItem])

  return (
    <UserMoviesContext.Provider value={value}>
      {children}
    </UserMoviesContext.Provider>
  )
}
