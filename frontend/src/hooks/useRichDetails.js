import { useState, useEffect } from 'react'
import { getMovieDetails, getSeriesDetails, getAnimeDetails } from '../services/api.js'
import { detailsCache } from '../utils/detailsCache.js'

// Traduz erro da chamada de detalhes em mensagem pro usuário, considerando
// qual API externa é a source (anime → MyAnimeList/Jikan, resto → TMDB) e o
// `code` que o backend marcou (UPSTREAM_RATE_LIMIT / UPSTREAM_DOWN).
const buildErrorMessage = (error, type) => {
  const source = type === 'ANIME' ? 'MyAnimeList' : 'TMDB'
  const code   = error.response?.data?.code

  if (!error.response) {
    return 'Não foi possível carregar detalhes adicionais. Sem conexão com o servidor.'
  }
  if (code === 'UPSTREAM_RATE_LIMIT') {
    return `Não foi possível carregar detalhes adicionais. ${source} está limitando as requisições — tenta de novo em alguns segundos.`
  }
  if (code === 'UPSTREAM_DOWN') {
    return `Não foi possível carregar detalhes adicionais. ${source} está fora do ar agora.`
  }
  return 'Não foi possível carregar detalhes adicionais. Tenta de novo daqui a pouco.'
}

/**
 * Busca os detalhes ricos (diretor, elenco, trailer, etc.) de um item
 * quando ele é aberto no modal. Usa cache de sessão para evitar re-fetches.
 *
 * Devolve `richDetailsError` (string) quando a API externa falha — o modal
 * continua mostrando os dados internos (sinopse, gêneros, etc.) que já tem,
 * e renderiza uma nota inline com essa mensagem em vez dos extras.
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
        let response
        if (item.type === 'MOVIE') response = await getMovieDetails(item.externalId)
        else if (item.type === 'SERIES') response = await getSeriesDetails(item.externalId)
        else response = await getAnimeDetails(item.externalId)

        if (!cancelled) {
          detailsCache.set(cacheKey, response.data)
          setRichDetails(response.data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar detalhes:', error)
          setRichDetailsError(buildErrorMessage(error, item.type))
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
