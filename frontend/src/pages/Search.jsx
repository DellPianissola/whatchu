import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  searchExternal, getPopularMovies, getPopularSeries, getExternalGenres,
  mapUpstreamError,
} from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { useMovieActions } from '../hooks/useMovieActions.js'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import CardModal from '../components/CardModal.jsx'
import Dropdown from '../components/Dropdown.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import MovieCard from '../components/MovieCard.jsx'
import Pagination from '../components/Pagination.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import { TYPE_LABEL } from '../utils/content.js'
import { ONBOARDING_TARGET, SEARCH_DEBOUNCE_MS, SKELETON_COUNT } from '../constants/ui.js'
import './Search.css'

const MODE = { PAGE: 'page', ONBOARDING: 'onboarding' }

const VALID_TYPES = ['movie', 'series']
const VALID_SORTS = ['date_asc', 'date_desc', 'rating_asc', 'rating_desc']

const parsePageParam = (value) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}
const parseTypeParam   = (value) => VALID_TYPES.includes(value) ? value : 'movie'
const parseSortParam   = (value) => VALID_SORTS.includes(value) ? value : null
const parseGenresParam = (value) => value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []

const splitSort = (sortBy) => {
  if (sortBy === 'date_asc')    return { sortDate: 'asc',  sortRating: null  }
  if (sortBy === 'date_desc')   return { sortDate: 'desc', sortRating: null  }
  if (sortBy === 'rating_asc')  return { sortDate: null,   sortRating: 'asc' }
  if (sortBy === 'rating_desc') return { sortDate: null,   sortRating: 'desc' }
  return { sortDate: null, sortRating: null }
}

const cycleSort = (current) => {
  if (current === null)   return 'desc'
  if (current === 'desc') return 'asc'
  return null
}

const getSortIcon = (sortState) => {
  if (sortState === 'asc')  return '↑'
  if (sortState === 'desc') return '↓'
  return ''
}

const Search = ({ mode = MODE.PAGE, onComplete, onSkip }) => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const { userMovies } = useUserMovies()
  const { processingId, addMovie, removeMovie, setPriority, findByItem } = useMovieActions()
  const isOnboarding = mode === MODE.ONBOARDING

  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [availableGenres, setAvailableGenres] = useState([])
  const [expandedItem, setExpandedItem] = useState(null)

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  // URL é fonte de verdade — type/page/sortBy/genres nunca em useState
  const type           = parseTypeParam(searchParams.get('type'))
  const currentPage    = parsePageParam(searchParams.get('page'))
  const sortBy         = parseSortParam(searchParams.get('sortBy'))
  const selectedGenres = parseGenresParam(searchParams.get('genres'))
  const { sortDate, sortRating } = splitSort(sortBy)

  // TMDB /search não suporta sort/gênero — UI desabilitada durante busca textual
  const textSearchActive    = debouncedQuery.trim().length > 0
  const sortAndGenreDisabled = textSearchActive

  const updateParams = (mutate, { resetPage = false } = {}) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }

  const setType = (newType) => {
    updateParams((next) => {
      if (newType === 'movie') next.delete('type')
      else next.set('type', newType)
      next.delete('genres') // gêneros são por-tipo
    }, { resetPage: true })
  }

  const setCurrentPage = (newPage) => {
    updateParams((next) => {
      if (newPage === 1) next.delete('page')
      else next.set('page', String(newPage))
    })
  }

  const setSortBy = (value) => {
    updateParams((next) => {
      if (!value) next.delete('sortBy')
      else next.set('sortBy', value)
    }, { resetPage: true })
  }

  const setSelectedGenres = (arr) => {
    updateParams((next) => {
      if (!arr || arr.length === 0) next.delete('genres')
      else next.set('genres', arr.join(','))
    }, { resetPage: true })
  }

  useEffect(() => {
    let cancelled = false
    getExternalGenres(type)
      .then((response) => { if (!cancelled) setAvailableGenres(response.data.genres || []) })
      .catch((error) => {
        console.error('Erro ao carregar gêneros:', error)
        if (!cancelled) setAvailableGenres([])
      })
    return () => { cancelled = true }
  }, [type])

  // reseta página ao mudar texto (debouncedQuery); type/sort/gênero já resetam nos setters
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const genresKey = selectedGenres.join(',')
  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      setLoading(true)
      try {
        const q = debouncedQuery.trim()
        const response = q
          ? await searchExternal(q, type, currentPage)
          : await (type === 'series' ? getPopularSeries : getPopularMovies)(currentPage, {
              sortBy: sortBy || undefined,
              genres: selectedGenres,
            })
        if (cancelled) return
        setResults(response.data.results || [])
        setTotalPages(response.data.totalPages || 1)
      } catch (error) {
        if (cancelled) return
        console.error('Erro ao buscar:', error)
        setResults([])
        setTotalPages(1)
        notifyExternalError(error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, type, currentPage, sortBy, genresKey])

  const notifyExternalError = (error) => {
    if (!error.response) {
      toast.error('Sem conexão com o servidor. Tenta de novo em alguns segundos.')
      return
    }
    const upstream = mapUpstreamError(error)
    toast.error(upstream || 'Erro ao buscar conteúdo. Tenta de novo.')
  }

  const handleSearchSubmit = (e) => {
    // busca é automática via useEffect; form existe pra UX (Enter, mobile submit)
    e.preventDefault()
  }

  const isMovieInList = (movie) => Boolean(findByItem(movie))

  const goToPage = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleSortDate = () => {
    const next = cycleSort(sortDate)
    setSortBy(next === null ? null : `date_${next}`)
  }

  const toggleSortRating = () => {
    const next = cycleSort(sortRating)
    setSortBy(next === null ? null : `rating_${next}`)
  }

  return (
    <div className={`search-page ${isOnboarding ? 'search-page-onboarding' : ''}`}>
      {isOnboarding && (
        <OnboardingHeader
          count={userMovies.length}
          target={ONBOARDING_TARGET}
          onSkip={() => onSkip?.()}
          onComplete={() => onComplete?.()}
        />
      )}

      <div className="search-container">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-header">
            <div className="search-type-filters">
              <button
                type="button"
                onClick={() => setType('movie')}
                className={`filter-btn ${type === 'movie' ? 'active' : ''}`}
              >
                🎬 Filmes
              </button>
              <button
                type="button"
                onClick={() => setType('series')}
                className={`filter-btn ${type === 'series' ? 'active' : ''}`}
              >
                📺 Séries
              </button>
            </div>

            <div className="search-input-group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do filme ou série..."
                className="search-input"
              />
            </div>

            <div className="search-sort-filters">
              <div className="sort-buttons">
                <button
                  type="button"
                  onClick={toggleSortDate}
                  disabled={sortAndGenreDisabled}
                  title={sortAndGenreDisabled ? 'Indisponível durante busca por texto' : ''}
                  className={`sort-btn ${sortDate ? 'active' : ''}`}
                >
                  📅 Data {getSortIcon(sortDate)}
                </button>
                <button
                  type="button"
                  onClick={toggleSortRating}
                  disabled={sortAndGenreDisabled}
                  title={sortAndGenreDisabled ? 'Indisponível durante busca por texto' : ''}
                  className={`sort-btn ${sortRating ? 'active' : ''}`}
                >
                  ⭐ Nota {getSortIcon(sortRating)}
                </button>
              </div>

              <Dropdown
                multi
                trigger="button"
                align="right"
                icon="🎭"
                label="Gêneros"
                options={availableGenres}
                value={selectedGenres}
                onChange={setSelectedGenres}
                disabled={sortAndGenreDisabled}
                disabledTitle="Indisponível durante busca por texto"
                emptyMessage="Nenhum gênero disponível"
              />
            </div>
          </div>
        </form>

        {loading && (
          <div className="results-grid">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="results-grid">
            {results.map((item) => (
              <MovieCard
                key={item.id}
                item={item}
                onClick={() => setExpandedItem(item)}
                posterBadge={TYPE_LABEL[item.type] ?? item.type}
                actions={
                  <AddToListButton
                    inList={isMovieInList(item)}
                    currentPriority={findByItem(item)?.priority}
                    processing={processingId === item.id}
                    disabled={!profile}
                    onAdd={(priority) => addMovie(item, priority)}
                    onChangePriority={(priority) => setPriority(item, priority)}
                    onRemove={() => removeMovie(item)}
                  />
                }
              />
            ))}
          </div>
        )}

        {!loading && totalPages > 0 && (
          <Pagination current={currentPage} total={totalPages} onChange={goToPage} />
        )}

        {!loading && results.length === 0 && (
          <EmptyState
            description={query ? 'Nenhum resultado encontrado' : 'Nenhum conteúdo popular encontrado'}
          />
        )}
      </div>

      {expandedItem && (
        <CardModal
          item={expandedItem}
          onClose={() => setExpandedItem(null)}
          actions={
            <AddToListButton
              inList={isMovieInList(expandedItem)}
              currentPriority={findByItem(expandedItem)?.priority}
              processing={processingId === expandedItem.id}
              disabled={!profile}
              compactPriority={false}
              onAdd={(priority) => addMovie(expandedItem, priority)}
              onChangePriority={(p) => setPriority(expandedItem, p)}
              onRemove={() => removeMovie(expandedItem)}
            />
          }
        />
      )}
    </div>
  )
}

export default Search
