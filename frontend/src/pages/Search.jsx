import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Film, Tv, Tv2, Calendar, Star, Tags, ArrowUp, ArrowDown, Check, Plus } from 'lucide-react'
import { TYPE_LABEL_PLURAL } from '../utils/content.js'
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
import TypeFilterPills from '../components/TypeFilterPills.jsx'
import SearchInput from '../components/SearchInput.jsx'
import SortSegmented from '../components/SortSegmented.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import WatchedToggle from '../components/WatchedToggle.jsx'
import ViewModeToggle from '../components/ViewModeToggle.jsx'
import PosterDetailsButton from '../components/PosterDetailsButton.jsx'
import Spinner from '../components/Spinner.jsx'
import Button from '../components/Button.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import FilterSheetTrigger from '../components/FilterSheetTrigger.jsx'
import SortCategoriesSection from '../components/SortCategoriesSection.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import { useStreamingProviders } from '../hooks/useStreamingProviders.js'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js'
import { parseCsvParam } from '../utils/queryParams.js'
import { buildSortValues } from '../utils/sort.jsx'
import { ONBOARDING_TARGET, SEARCH_DEBOUNCE_MS, SKELETON_COUNT, VIEW_MODES, DEFAULT_VIEW_MODE, TMDB_MAX_PAGE } from '../constants/ui.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
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

// TMDB usa `movie`/`series` minúsculo no param — não é o enum interno de TYPE_LABEL.
const TYPE_OPTIONS = [
  { value: 'movie',  label: TYPE_LABEL_PLURAL.MOVIE,  Icon: Film },
  { value: 'series', label: TYPE_LABEL_PLURAL.SERIES, Icon: Tv   },
]

const SORT_FIELDS = [
  { field: 'date',   label: 'Data', Icon: Calendar },
  { field: 'rating', label: 'Nota', Icon: Star     },
]

const VALID_TYPES = TYPE_OPTIONS.map(({ value }) => value)
const VALID_SORTS = buildSortValues(SORT_FIELDS)

// TMDB repete itens entre páginas — sem dedupe o append quebra a key do React.
const dedupeById = (items) => {
  const seen = new Set()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

const parseTypeParam   = (value) => VALID_TYPES.includes(value) ? value : 'movie'
const parseSortParam   = (value) => VALID_SORTS.includes(value) ? value : null

const Search = ({ mode = MODE.PAGE, onComplete, onSkip }) => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const { userMovies } = useUserMovies()
  const { processingId, addMovie, removeMovie, setPriority, setWatched, findByItem } = useMovieActions()
  const isOnboarding = mode === MODE.ONBOARDING

  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const [availableGenres, setAvailableGenres] = useState([])
  const { options: streamingOptions } = useStreamingProviders()
  const [expandedItem, setExpandedItem] = useState(null)
  const [viewMode, setViewMode] = useLocalStorageState(STORAGE_KEYS.VIEW_MODE, DEFAULT_VIEW_MODE)

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  // URL é fonte de verdade — type/sortBy/genres nunca em useState
  const type           = parseTypeParam(searchParams.get('type'))
  const sortBy         = parseSortParam(searchParams.get('sortBy'))
  const selectedGenres = parseCsvParam(searchParams.get('genres'))
  const selectedProviders = parseCsvParam(searchParams.get('providers'))

  // TMDB /search não suporta sort/gênero — UI desabilitada durante busca textual
  const textSearchActive    = debouncedQuery.trim().length > 0
  const sortAndGenreDisabled = textSearchActive

  const updateParams = (mutate) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    setSearchParams(next)
  }

  const setType = (newType) => {
    updateParams((next) => {
      if (newType === 'movie') next.delete('type')
      else next.set('type', newType)
      next.delete('genres')
    })
  }

  const setSortBy = (value) => {
    updateParams((next) => {
      if (!value) next.delete('sortBy')
      else next.set('sortBy', value)
    })
  }

  const setSelectedGenres = (arr) => {
    updateParams((next) => {
      if (!arr || arr.length === 0) next.delete('genres')
      else next.set('genres', arr.join(','))
    })
  }

  const setSelectedProviders = (arr) => {
    updateParams((next) => {
      if (!arr || arr.length === 0) next.delete('providers')
      else next.set('providers', arr.join(','))
    })
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
  // Ao iniciar busca por texto, limpa os filtros.
  useEffect(() => {
    if (debouncedQuery.trim() && (sortBy || selectedGenres.length > 0 || selectedProviders.length > 0)) {
      commitFiltersToUrl(null, [], [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const genresKey = selectedGenres.join(',')
  const providersKey = selectedProviders.join(',')
  const filterKey = [debouncedQuery.trim(), type, sortBy || '', genresKey, providersKey].join('|')
  const [activeFilterKey, setActiveFilterKey] = useState(filterKey)

  // Ajuste de estado durante o render (padrão do React pra estado derivado): zera
  // paginação e resultados junto com a troca de filtro, pro fetch abaixo já rodar
  // na página 1. Com useEffect sairia um request extra da página antiga.
  // O loading entra aqui junto: sem ele haveria um frame pintado com a lista já
  // vazia e loading false, piscando o EmptyState antes dos skeletons.
  if (filterKey !== activeFilterKey) {
    setActiveFilterKey(filterKey)
    setPage(1)
    setResults([])
    setLoading(true)
    setLoadMoreFailed(false)
  }

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      setLoading(true)
      try {
        const q = debouncedQuery.trim()
        const data = q
          ? await searchExternal(q, type, page)
          : await (type === 'series' ? getPopularSeries : getPopularMovies)(page, {
              sortBy: sortBy || undefined,
              genres: selectedGenres,
              providers: selectedProviders,
            })
        if (cancelled) return
        const incoming = data.results || []
        setResults((prev) => (page === 1 ? incoming : dedupeById([...prev, ...incoming])))
        setTotalPages(data.totalPages || 1)
      } catch (error) {
        if (cancelled) return
        console.error('Erro ao buscar:', error)
        if (page === 1) {
          setResults([])
          setTotalPages(1)
        } else {
          // Trava o auto-load: sem isso o sentinel continua visível e dispara a
          // página seguinte em loop, um toast por tentativa, com o upstream fora.
          setLoadMoreFailed(true)
        }
        notifyExternalError(error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, retryToken])

  const hasMore = page < Math.min(totalPages, TMDB_MAX_PAGE)
  const sentinelRef = useInfiniteScroll(() => setPage((p) => p + 1), {
    enabled: !loading && hasMore && !loadMoreFailed && results.length > 0,
  })

  // Refaz a mesma página que falhou (page não muda, o token é que destrava o efeito).
  const retryLoadMore = () => {
    setLoadMoreFailed(false)
    setRetryToken((t) => t + 1)
  }

  // Compara o valor anterior (não um boolean de mount) pra não rolar no remonte
  // do StrictMode nem na primeira carga, só quando o filtro realmente muda.
  const prevFilterKey = useRef(filterKey)
  useEffect(() => {
    if (prevFilterKey.current === filterKey) return
    prevFilterKey.current = filterKey
    window.scrollTo({ top: 0 })
  }, [filterKey])

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

  const expandedUserMovie = findByItem(expandedItem)

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
            <div className="search-query-group">
              <SearchInput
                className="search-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do filme ou série..."
              />
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>

            <div className="search-scope">
              <TypeFilterPills
                multi={false}
                options={TYPE_OPTIONS}
                value={type}
                onChange={setType}
              />
            </div>

            <div className="search-sort-filters">
              <SortSegmented
                fields={SORT_FIELDS}
                value={sortBy}
                onChange={setSortBy}
                disabled={sortAndGenreDisabled}
                disabledTitle="Indisponível durante busca por texto"
              />

              <div className="search-filters">
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
            </div>

            <FilterSheetTrigger
              count={activeFilterCount}
              onClick={() => filterSheet.openWith({ sortBy, genres: selectedGenres, providers: selectedProviders })}
            />
          </div>
        </form>

        {loading && results.length === 0 && (
          <div className="results-grid">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className={viewMode === VIEW_MODES.POSTERS ? 'ui-poster-grid' : 'results-grid'}>
            {results.map((item) => {
              const userMovie = findByItem(item)
              const inList = Boolean(userMovie)

              if (viewMode === VIEW_MODES.POSTERS) {
                const processing = processingId === item.id
                return (
                  <MovieCard
                    key={item.id}
                    item={item}
                    layout="poster"
                    inList={inList}
                    watched={userMovie?.watched}
                    ariaLabel={inList
                      ? `${item.title}, na lista. Tocar para remover`
                      : `${item.title}. Tocar para adicionar à lista`}
                    ariaPressed={inList}
                    onClick={() => (inList ? removeMovie(item) : addMovie(item))}
                    posterOverlay={
                      <>
                        <PosterDetailsButton onOpen={() => setExpandedItem(item)} />
                        <span
                          className={`ui-poster-state ${processing ? 'ui-poster-state--busy' : (inList ? 'ui-poster-state--in' : 'ui-poster-state--out')}`}
                          aria-hidden="true"
                        >
                          {processing ? <Spinner size="sm" /> : (inList ? <Check size={16} /> : <Plus size={16} />)}
                        </span>
                      </>
                    }
                  />
                )
              }

              return (
                <MovieCard
                  key={item.id}
                  item={item}
                  watched={userMovie?.watched}
                  onClick={() => setExpandedItem(item)}
                  posterOverlay={
                    userMovie
                      ? <WatchedToggle watched={userMovie.watched} onToggle={() => setWatched(userMovie)} />
                      : null
                  }
                  actions={
                    <AddToListButton
                      inList={inList}
                      currentPriority={userMovie?.priority}
                      processing={processingId === item.id}
                      disabled={!profile}
                      onAdd={(priority) => addMovie(item, priority)}
                      onChangePriority={(priority) => setPriority(item, priority)}
                      onRemove={() => removeMovie(item)}
                    />
                  }
                />
              )
            })}
          </div>
        )}

        {results.length > 0 && hasMore && (
          <div ref={sentinelRef} className="ui-infinite-sentinel">
            {loadMoreFailed
              ? <Button size="sm" pill onClick={retryLoadMore}>Tentar de novo</Button>
              : loading && <Spinner />}
          </div>
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
          posterOverlay={
            expandedUserMovie
              ? <WatchedToggle watched={expandedUserMovie.watched} onToggle={() => setWatched(expandedUserMovie)} />
              : null
          }
          actions={
            <AddToListButton
              inList={Boolean(expandedUserMovie)}
              currentPriority={expandedUserMovie?.priority}
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
