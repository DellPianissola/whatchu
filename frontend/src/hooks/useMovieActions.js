import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { apiErrorMessage } from '../services/api.js'
import { PRIORITY_LABEL } from '../utils/content.js'

export const useMovieActions = () => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const { addToList, removeFromList, changePriority, toggleWatched, findByItem } = useUserMovies()
  const [processingId, setProcessingId] = useState(null)

  const addMovie = useCallback(async (movie, priority) => {
    if (!profile) {
      toast.error('Perfil não encontrado!')
      return null
    }
    if (findByItem(movie)) return null
    setProcessingId(movie.id)
    try {
      const created = await addToList(movie, priority)
      toast.success(`"${movie.title}" adicionado à lista`)
      return created
    } catch (error) {
      console.error('Erro ao adicionar filme:', error)
      toast.error(apiErrorMessage(error, 'Erro ao adicionar filme'))
      return null
    } finally {
      setProcessingId(null)
    }
  }, [profile, addToList, findByItem, toast])

  const removeMovie = useCallback(async (movie) => {
    const userMovie = findByItem(movie) || movie
    if (!userMovie?.id) return
    setProcessingId(movie.id)
    try {
      await removeFromList(userMovie.id)
      toast.success(`"${movie.title}" removido da lista`)
    } catch (error) {
      console.error('Erro ao remover filme:', error)
      toast.error(apiErrorMessage(error, 'Erro ao remover filme'))
    } finally {
      setProcessingId(null)
    }
  }, [removeFromList, findByItem, toast])

  const setPriority = useCallback(async (movie, priority) => {
    const userMovie = findByItem(movie) || movie
    if (!userMovie?.id || userMovie.priority === priority) return
    try {
      await changePriority(userMovie.id, priority)
      toast.success(`Prioridade alterada para ${PRIORITY_LABEL[priority]}`)
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error)
      toast.error('Erro ao atualizar prioridade')
    }
  }, [changePriority, findByItem, toast])

  const setWatched = useCallback(async (movie) => {
    try {
      await toggleWatched(movie)
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      toast.error('Erro ao atualizar item')
    }
  }, [toggleWatched, toast])

  return { processingId, addMovie, removeMovie, setPriority, setWatched, findByItem }
}
