import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { apiErrorMessage } from '../services/api.js'
import { PRIORITY_LABEL } from '../utils/content.js'
import { UNDO_DELETE_MS } from '../constants/ui.js'

export const useMovieActions = () => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const { addToList, scheduleRemoval, cancelRemoval, cancelRemovalForItem, changePriority, toggleWatched, setProgress, findByItem } = useUserMovies()
  const [processingId, setProcessingId] = useState(null)
  // Guarda síncrona: processingId é state e atrasa um render, deixando dois
  // toques rápidos passarem. O Set bloqueia a reentrância no mesmo id na hora.
  const inFlight = useRef(new Set())

  const addMovie = useCallback(async (movie, priority) => {
    if (!profile) {
      toast.error('Perfil não encontrado!')
      return null
    }
    if (findByItem(movie)) return null
    const restored = cancelRemovalForItem(movie)
    if (restored) {
      toast.success(`"${movie.title}" continua na lista`)
      return restored
    }
    if (inFlight.current.has(movie.id)) return null
    inFlight.current.add(movie.id)
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
      inFlight.current.delete(movie.id)
      setProcessingId(null)
    }
  }, [profile, addToList, cancelRemovalForItem, findByItem, toast])

  const removeMovie = useCallback((movie) => {
    const userMovie = findByItem(movie) || movie
    if (!userMovie?.id) return
    const scheduled = scheduleRemoval(userMovie.id, {
      delayMs: UNDO_DELETE_MS,
      onError: (error) => {
        console.error('Erro ao remover filme:', error)
        toast.error(apiErrorMessage(error, 'Erro ao remover filme'))
      },
    })
    if (!scheduled) return
    toast.success(`"${movie.title}" removido da lista`, {
      duration: UNDO_DELETE_MS,
      action: {
        label: 'Desfazer',
        // O DELETE em voo não volta atrás: sem esse aviso o toast fecharia
        // normalmente e o usuário acharia que desfez.
        onClick: () => {
          if (!cancelRemoval(userMovie.id)) {
            toast.error(`Não deu tempo — "${movie.title}" já foi removido`)
          }
        },
      },
    })
  }, [scheduleRemoval, cancelRemoval, findByItem, toast])

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

  // `silent` é pra correção automática de watched: o usuário só abriu o modal,
  // então toast de erro seria sobre uma ação que ele não pediu.
  const setEpisodeProgress = useCallback(async (movie, pointer, watched, { silent = false } = {}) => {
    const userMovie = findByItem(movie) || movie
    if (!userMovie?.id) return
    try {
      await setProgress(userMovie, pointer, watched)
    } catch (error) {
      console.error('Erro ao salvar progresso:', error)
      if (!silent) toast.error(apiErrorMessage(error, 'Erro ao salvar progresso'))
    }
  }, [setProgress, findByItem, toast])

  return { processingId, addMovie, removeMovie, setPriority, setWatched, setEpisodeProgress, findByItem }
}
