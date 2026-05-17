import { useState, useEffect } from 'react'
import { getMovieDetails, getSeriesDetails } from '../services/api.js'
import { detailsCache } from '../utils/detailsCache.js'

const buildErrorMessage = (error) => {
  const code = error.response?.data?.code

  if (!error.response) {
    return 'Não foi possível carregar detalhes adicionais. Sem conexão com o servidor.'
  }
  if (code === 'UPSTREAM_RATE_LIMIT') {
    return 'Não foi possível carregar detalhes adicionais. TMDB está limitando as requisições — tenta de novo em alguns segundos.'
  }
  if (code === 'UPSTREAM_DOWN') {
    return 'Não foi possível carregar detalhes adicionais. TMDB está fora do ar agora.'
  }
  return 'Não foi possível carregar detalhes adicionais. Tenta de novo daqui a pouco.'
}

/**
 * Busca os detalhes ricos (diretor, elenco, trailer, etc.) de um item
 * quando ele é aberto no modal. Usa cache de sessão para evitar re-fetches.
 */
export const useRichDetails = (item) => {
  const [richDetails, setRichDetails] = useState(null)
  const [richDetailsLoading, setRichDetailsLoading] = useState(false)
  const [richDetailsError, setRichDetailsError] = useState(null)

  useEffect(() => {
    if (!item?.externalId) {
      setRichDetails(null)
      setRichDetailsError(null)
      return
    }

    const cacheKey = `${item.type}:${item.externalId}`
    if (detailsCache.has(cacheKey)) {
      setRichDetails(detailsCache.get(cacheKey))
      setRichDetailsLoading(false)
      setRichDetailsError(null)
      return
    }

    let cancelled = false
    setRichDetails(null)
    setRichDetailsError(null)
    setRichDetailsLoading(true)

    const fetchDetails = async () => {
      try {
        const response = item.type === 'SERIES'
          ? await getSeriesDetails(item.externalId)
          : await getMovieDetails(item.externalId)

        if (!cancelled) {
          detailsCache.set(cacheKey, response.data)
          setRichDetails(response.data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar detalhes:', error)
          setRichDetailsError(buildErrorMessage(error))
        }
      } finally {
        if (!cancelled) setRichDetailsLoading(false)
      }
    }

    fetchDetails()
    return () => { cancelled = true }
  }, [item?.externalId, item?.type])

  return { richDetails, richDetailsLoading, richDetailsError }
}
