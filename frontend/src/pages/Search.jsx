import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Film, Tv, Tv2, Calendar, Star, Tags, ArrowUp, ArrowDown } from 'lucide-react'
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
import FilterSheet from '../components/FilterSheet.jsx'
import FilterSheetTrigger from '../components/FilterSheetTrigger.jsx'
import SortCategoriesSection from '../components/SortCategoriesSection.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import { useStreamingProviders } from '../hooks/useStreamingProviders.js'
import { parseCsvParam } from '../utils/queryParams.js'
import { cycleSort, getSortIcon } from '../utils/sort.jsx'
import { ONBOARDING_TARGET, SEARCH_DEBOUNCE_MS, SKELETON_COUNT } from '../constants/ui.js'
import './Search.css'

const MODE = { PAGE: 'page', ONBOARDING: 'onboarding' }

// ↓ = ascendente (menor primeiro), ↑ = descendente (maior primeiro)
const SORT_CATEGORIES = [
  {
    Icon: Calendar,
    label: 'Por data',
    options: [
      { value: 'date_asc',  ariaLabel: 'Mais antigos primeiro',  Icon: ArrowDown },
      { value: 'date_desc', ariaLabel: 'Mais recentes primeiro', Icon: ArrowUp   },
    ],
  },
  {
    Icon: Star,
    label: 'Por nota',
    options: [
      { value: 'rating_asc',  ariaLabel: 'Menor nota primeiro', Icon: ArrowDown },
      { value: 'rating_desc', ariaLabel: 'Maior nota primeiro', Icon: ArrowUp   },
    ],
  },
]

const VALID_TYPES = ['movie', 'series']
const VALID_SORTS = ['date_asc', 'date_desc', 'rating_asc', 'rating_desc']

const parsePageParam = (value) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}
const parseTypeParam   = (value) => VALID_TYPES.includes(value) ? value : 'movie'
const parseSortParam   = (value) => VALID_SORTS.includes(value) ? value : null
const splitSort = (sortBy) => {
  if (sortBy === 'date_asc')    return { sortDate: 'asc',  sortRating: null  }
  if (sortBy === 'date_desc')   return { sortDate: 'desc', sortRating: null  }
  if (sortBy === 'rating_asc')  return { sortDate: null,   sortRating: 'asc' }
  if (sortBy === 'rating_desc') return { sortDate: null,   sortRating: 'desc' }
  return { sortDate: null, sortRating: null }
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
  const { options: streamingOptions } = useStreamingProviders()
  const [expandedItem, setExpandedItem] = useState(null)

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  // URL é fonte de verdade — type/page/sortBy/genres nunca em useState
  const type           = parseTypeParam(searchParams.get('type'))
  const currentPage    = parsePageParam(searchParams.get('page'))
  const sortBy         = parseSortParam(searchParams.get('sortBy'))
  const selectedGenres = parseCsvParam(searchParams.get('genres'))
  const selectedProviders = parseCsvParam(searchParams.get('providers'))
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
      next.delete('genres')
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

  const setSelectedProviders = (arr) => {
    updateParams((next) => {
      if (!arr || arr.length === 0) next.delete('providers')
      else next.set('providers', arr.join(','))
    }, { resetPage: true })
  }

  useEffect(() => {
    let cancelled = false
    getExternalGenres(type)
      .then((genres) => { if (!cancelled) setAvailableGenres(genres || []) })
      .catch((error) => {
        console.error('Erro ao carregar gêneros:', error)
        if (!cancelled) setAvailableGenres([])
      })
    return () => { cancelled = true }
  }, [type])

  // Texto + sort/gênero/streaming são mutuamente exclusivos (TMDB /search não suporta).
  // Ao iniciar busca por texto, limpa filtros e reseta página juntos.
  useEffect(() => {
    if (debouncedQuery.trim() && (sortBy || selectedGenres.length > 0 || selectedProviders.length > 0)) {
      commitFiltersToUrl(null, [], [])
      return
    }
    if (currentPage !== 1) setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const genresKey = selectedGenres.join(',')
  const providersKey = selectedProviders.join(',')
  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      setLoading(true)
      try {
        const q = debouncedQuery.trim()
        const data = q
          ? await searchExternal(q, type, currentPage)
          : await (type === 'series' ? getPopularSeries : getPopularMovies)(currentPage, {
              sortBy: sortBy || undefined,
              genres: selectedGenres,
              providers: selectedProviders,
            })
        if (cancelled) return
        setResults(data.results || [])
        setTotalPages(data.totalPages || 1)
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
  }, [debouncedQuery, type, currentPage, sortBy, genresKey, providersKey])

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

  const activeFilterCount = (sortBy ? 1 : 0) + selectedGenres.length + selectedProviders.length

  // Batchar sortBy + genres + providers numa única setSearchParams pra evitar que a segunda
  // chamada sobrescreva a primeira (cada setSearchParams lê searchParams stale).
  const commitFiltersToUrl = (sortByValue, genresArr, providersArr) => {
    const next = new URLSearchParams(searchParams)
    if (!sortByValue) next.delete('sortBy')
    else next.set('sortBy', sortByValue)
    if (!genresArr || genresArr.length === 0) next.delete('genres')
    else next.set('genres', genresArr.join(','))
    if (!providersArr || providersArr.length === 0) next.delete('providers')
    else next.set('providers', providersArr.join(','))
    next.delete('page')
    setSearchParams(next)
  }

  const filterSheet = useFilterSheet({
    defaults: { sortBy: null, genres: [], providers: [] },
    onCommit: ({ sortBy: s, genres: g, providers: p }) => commitFiltersToUrl(s, g, p),
  })

  const sheetFilters = (
    <>
      <SortCategoriesSection
        categories={SORT_CATEGORIES}
        value={filterSheet.pending.sortBy}
        onChange={(val) => filterSheet.setField('sortBy', val)}
        disabled={sortAndGenreDisabled}
        deselectable
      />

      <section className="filter-section">
        <span className="filter-section-label">Gêneros</span>
        <Dropdown
          multi
          trigger="button"
          align="left"
          label="Selecionar"
          options={availableGenres}
          value={filterSheet.pending.genres}
          onChange={(val) => filterSheet.setField('genres', val)}
          disabled={sortAndGenreDisabled}
          disabledTitle="Indisponível durante busca por texto"
          emptyMessage="Nenhum gênero disponível"
        />
      </section>

      {streamingOptions.length > 0 && (
        <section className="filter-section">
          <span className="filter-section-label">Streaming</span>
          <Dropdown
            multi
            trigger="button"
            align="left"
            label="Selecionar"
            options={streamingOptions}
            value={filterSheet.pending.providers}
            onChange={(val) => filterSheet.setField('providers', val)}
            disabled={sortAndGenreDisabled}
            disabledTitle="Indisponível durante busca por texto"
            emptyMessage="Nenhum streaming disponível"
          />
        </section>
      )}
    </>
  )

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
                <Film size={18} /> Filmes
              </button>
              <button
                type="button"
                onClick={() => setType('series')}
                className={`filter-btn ${type === 'series' ? 'active' : ''}`}
              >
                <Tv size={18} /> Séries
              </button>
            </div>

            <div className="search-input-group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do filme ou série..."
                className="ui-search-input"
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
                  <Calendar size={14} /> Data {getSortIcon(sortDate)}
                </button>
                <button
                  type="button"
                  onClick={toggleSortRating}
                  disabled={sortAndGenreDisabled}
                  title={sortAndGenreDisabled ? 'Indisponível durante busca por texto' : ''}
                  className={`sort-btn ${sortRating ? 'active' : ''}`}
                >
                  <Star size={14} /> Nota {getSortIcon(sortRating)}
                </button>
              </div>

              <Dropdown
                multi
                trigger="button"
                align="right"
                icon={<Tags size={14} />}
                label="Gêneros"
                options={availableGenres}
                value={selectedGenres}
                onChange={setSelectedGenres}
                disabled={sortAndGenreDisabled}
                disabledTitle="Indisponível durante busca por texto"
                emptyMessage="Nenhum gênero disponível"
              />

              {streamingOptions.length > 0 && (
                <Dropdown
                  multi
                  trigger="button"
                  align="right"
                  icon={<Tv2 size={14} />}
                  label="Streaming"
                  options={streamingOptions}
                  value={selectedProviders}
                  onChange={setSelectedProviders}
                  disabled={sortAndGenreDisabled}
                  disabledTitle="Indisponível durante busca por texto"
                  emptyMessage="Nenhum streaming disponível"
                />
              )}
            </div>

            <FilterSheetTrigger
              count={activeFilterCount}
              onClick={() => filterSheet.openWith({ sortBy, genres: selectedGenres, providers: selectedProviders })}
            />
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

      <FilterSheet
        open={filterSheet.open}
        onClose={filterSheet.close}
        onClear={filterSheet.clear}
      >
        {sheetFilters}
      </FilterSheet>
    </div>
  )
}

export default Search
