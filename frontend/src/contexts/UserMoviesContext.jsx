import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
  const [pendingRemovalIds, setPendingRemovalIds] = useState([])
  const removalTimers = useRef(new Map())

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

  const commitRemoval = useCallback(async (id) => {
    removalTimers.current.delete(id)
    try {
      await removeUserMovie(id)
      setUserMovies((prev) => prev.filter((m) => m.id !== id))
    } finally {
      // Sai de "pendente" mesmo em erro: aí o item reaparece na lista, que é a
      // verdade — o backend nunca chegou a apagar.
      setPendingRemovalIds((prev) => prev.filter((x) => x !== id))
    }
  }, [])

  const scheduleRemoval = useCallback((id, { delayMs, onError }) => {
    if (removalTimers.current.has(id)) return false
    setPendingRemovalIds((prev) => [...prev, id])
    const timer = setTimeout(() => {
      commitRemoval(id).catch((err) => onError?.(err))
    }, delayMs)
    removalTimers.current.set(id, timer)
    return true
  }, [commitRemoval])

  const cancelRemoval = useCallback((id) => {
    const timer = removalTimers.current.get(id)
    if (!timer) return false
    clearTimeout(timer)
    removalTimers.current.delete(id)
    setPendingRemovalIds((prev) => prev.filter((x) => x !== id))
    return true
  }, [])

  // Re-adicionar um item com remoção pendente devolve o registro original em vez
  // de criar outro — senão o novo nasceria sem prioridade, watched e progresso.
  const cancelRemovalForItem = useCallback((item) => {
    if (pendingRemovalIds.length === 0) return null
    const pending = userMovies.filter((m) => pendingRemovalIds.includes(m.id))
    const match = findUserMovie(pending, item)
    if (!match) return null
    return cancelRemoval(match.id) ? match : null
  }, [userMovies, pendingRemovalIds, cancelRemoval])

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

  // Some da UI já no agendamento; o DELETE só sai quando a janela de undo expira.
  const visibleMovies = useMemo(
    () => pendingRemovalIds.length === 0
      ? userMovies
      : userMovies.filter((m) => !pendingRemovalIds.includes(m.id)),
    [userMovies, pendingRemovalIds]
  )

  const findByItem = useCallback((item) => findUserMovie(visibleMovies, item), [visibleMovies])

  // Timer pendente na troca de perfil/desmonte é descartado sem deletar: some o
  // toast que daria o undo, então falhar sem apagar é o lado seguro.
  useEffect(() => {
    const timers = removalTimers.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
      setPendingRemovalIds([])
    }
  }, [profile?.id])

  const value = useMemo(() => ({
    userMovies: visibleMovies,
    isLoading,
    error,
    refresh,
    addToList,
    scheduleRemoval,
    cancelRemoval,
    cancelRemovalForItem,
    changePriority,
    toggleWatched,
    setProgress,
    findByItem,
  }), [visibleMovies, isLoading, error, refresh, addToList, scheduleRemoval, cancelRemoval, cancelRemovalForItem, changePriority, toggleWatched, setProgress, findByItem])

  return (
    <UserMoviesContext.Provider value={value}>
      {children}
    </UserMoviesContext.Provider>
  )
}
