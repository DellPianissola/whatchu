import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Calendar, Clapperboard, Flame, Star, Type, Eye, EyeOff } from 'lucide-react'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { useMovieActions } from '../hooks/useMovieActions.js'
import CardModal from '../components/CardModal.jsx'
import MovieCard from '../components/MovieCard.jsx'
import WatchedToggle from '../components/WatchedToggle.jsx'
import ViewModeToggle from '../components/ViewModeToggle.jsx'
import PosterDetailsButton from '../components/PosterDetailsButton.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import TypeFilterPills from '../components/TypeFilterPills.jsx'
import SearchInput from '../components/SearchInput.jsx'
import SortSegmented from '../components/SortSegmented.jsx'
import Segmented from '../components/Segmented.jsx'
import Toolbar from '../components/Toolbar.jsx'
import Dropdown from '../components/Dropdown.jsx'
import StatPills from '../components/StatPills.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import FilterSheetTrigger from '../components/FilterSheetTrigger.jsx'
import SortCategoriesSection from '../components/SortCategoriesSection.jsx'
import Button from '../components/Button.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import { useStreamingProviders } from '../hooks/useStreamingProviders.js'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js'
import { ROUTES } from '../constants/routes.js'
import { SEARCH_DEBOUNCE_MS, VIEW_MODES, DEFAULT_VIEW_MODE } from '../constants/ui.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { TYPE_LABEL, ALL_TYPES } from '../utils/content.js'
import { parseCsvParam, toggleInList } from '../utils/queryParams.js'
import { buildSortValues, buildSortCategories } from '../utils/sort.jsx'
import {
  WATCHED_VALUES, WATCHED_NONE, parseWatchedParam, encodeWatched, matchesWatched,
} from '../utils/watchedFilter.js'
import './MyList.css'

const PAGE_SIZE = 20
const DEFAULT_SORT = 'added_desc'

const PRIORITY_ORDER = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

const SORT_FIELDS = [
  { field: 'added',    label: 'Adicionado', Icon: Calendar,     ascLabel: 'Adicionado há mais tempo',   descLabel: 'Adicionado recentemente'  },
  { field: 'release',  label: 'Lançamento', Icon: Clapperboard, ascLabel: 'Lançamento mais antigo',     descLabel: 'Lançamento mais recente'  },
  { field: 'priority', label: 'Prioridade', Icon: Flame,        ascLabel: 'Baixa prioridade primeiro',  descLabel: 'Alta prioridade primeiro' },
  { field: 'rating',   label: 'Nota',       Icon: Star,         ascLabel: 'Menor nota primeiro',        descLabel: 'Maior nota primeiro'      },
  { field: 'title',    label: 'Título',     Icon: Type,         ascLabel: 'A a Z',                      descLabel: 'Z a A'                    },
]

const VALID_SORTS     = buildSortValues(SORT_FIELDS)
const SORT_CATEGORIES = buildSortCategories(SORT_FIELDS)

const WATCHED_LABELS = {
  false: { label: 'Não assistidos', Icon: EyeOff },
  true:  { label: 'Assistidos',     Icon: Eye    },
}

const WATCHED_OPTIONS = WATCHED_VALUES.map((value) => ({ value, ...WATCHED_LABELS[value] }))

const parseTypesParam = (csv) => {
  if (csv === null) return ALL_TYPES
  if (csv === '') return []
  const list = csv.split(',').filter((t) => ALL_TYPES.includes(t))
  return list
}

const parseSortParam = (value) => VALID_SORTS.includes(value) ? value : DEFAULT_SORT

const sortMovies = (list, sortBy) => {
  const [field, direction] = (sortBy || DEFAULT_SORT).split('_')
  const dir = direction === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    let cmp = 0
    if (field === 'added') {
      cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    } else if (field === 'release') {
      cmp = (a.year || 0) - (b.year || 0)
    } else if (field === 'priority') {
      cmp = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0)
    } else if (field === 'rating') {
      cmp = (a.rating || 0) - (b.rating || 0)
    } else if (field === 'title') {
      cmp = (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' })
    }
    return cmp * dir
  })
}

const DeleteConfirmWrap = ({ movie, confirming, onConfirm, children }) => (
  <div
    data-card-id={movie.id}
    className={confirming ? 'ui-movie-card-wrap ui-movie-card-wrap--deleting' : 'ui-movie-card-wrap'}
  >
    {children}
    {confirming && (
      <div className="card-delete-overlay">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConfirm() }}
          className="card-delete-icon"
          title="Confirmar remoção"
          aria-label="Confirmar remoção"
        >
          <Trash2 size={48} />
        </button>
      </div>
    )}
  </div>
)

const MyList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userMovies, isLoading } = useUserMovies()
  const { addMovie, removeMovie, setPriority, setWatched } = useMovieActions()

  const types          = parseTypesParam(searchParams.get('types'))
  const watched        = searchParams.get('watched') ?? ''
  const watchedList    = parseWatchedParam(watched)
  const sortBy         = parseSortParam(searchParams.get('sortBy'))
  const selectedGenres    = parseCsvParam(searchParams.get('genres'))
  const selectedProviders = parseCsvParam(searchParams.get('providers'))

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  const { providers: streamingProviders, options: streamingOptions } = useStreamingProviders()

  const [expandedItemId, setExpandedItemId] = useState(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [viewMode, setViewMode] = useLocalStorageState(STORAGE_KEYS.VIEW_MODE, DEFAULT_VIEW_MODE)

  const expandedLive = userMovies.find((m) => m.id === expandedItemId) ?? null
  const [expandedSnapshot, setExpandedSnapshot] = useState(null)
  const expandedItem = expandedLive ?? expandedSnapshot

  useEffect(() => {
    if (expandedLive) setExpandedSnapshot(expandedLive)
  }, [expandedLive])

  const closeExpanded = () => {
    setExpandedItemId(null)
    setExpandedSnapshot(null)
  }

  useEffect(() => {
    if (!confirmingDeleteId) return
    const handler = (e) => {
      if (e.target.closest(`[data-card-id="${confirmingDeleteId}"]`)) return
      setConfirmingDeleteId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [confirmingDeleteId])

  const updateParams = (mutate) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    setSearchParams(next, { replace: true })
  }

  const setTypes = (nextTypes) => {
    updateParams((next) => {
      if (nextTypes.length === ALL_TYPES.length) next.delete('types')
      else if (nextTypes.length === 0) next.set('types', '')
      else next.set('types', nextTypes.join(','))
      next.delete('genres')
    })
  }

  const commitSheetFiltersToUrl = ({ sortBy: sortByValue, watched: watchedValue, genres: genresArr, providers: providersArr }) => {
    const next = new URLSearchParams(searchParams)
    if (!sortByValue || sortByValue === DEFAULT_SORT) next.delete('sortBy')
    else next.set('sortBy', sortByValue)
    if (!watchedValue) next.delete('watched')
    else next.set('watched', watchedValue)
    if (!genresArr || genresArr.length === 0) next.delete('genres')
    else next.set('genres', genresArr.join(','))
    if (!providersArr || providersArr.length === 0) next.delete('providers')
    else next.set('providers', providersArr.join(','))
    setSearchParams(next, { replace: true })
  }

  const setSortBy = (value) => updateParams((next) => {
    if (!value || value === DEFAULT_SORT) next.delete('sortBy')
    else next.set('sortBy', value)
  })

  const toggleWatched = (value) => updateParams((next) => {
    const encoded = encodeWatched(toggleInList(watchedList, value))
    if (!encoded) next.delete('watched')
    else next.set('watched', encoded)
  })

  const setGenres = (arr) => updateParams((next) => {
    if (!arr || arr.length === 0) next.delete('genres')
    else next.set('genres', arr.join(','))
  })

  const setProviders = (arr) => updateParams((next) => {
    if (!arr || arr.length === 0) next.delete('providers')
    else next.set('providers', arr.join(','))
  })

  const filterSheet = useFilterSheet({
    defaults: { sortBy: DEFAULT_SORT, watched: '', genres: [], providers: [] },
    onCommit: commitSheetFiltersToUrl,
  })

  const availableGenres = useMemo(() => {
    const set = new Set()
    for (const m of userMovies) {
      for (const g of (m.genres || [])) set.add(g)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [userMovies])

  const providerTmdbIdsByKey = useMemo(() => {
    const map = new Map()
    for (const p of streamingProviders) map.set(p.key, p.tmdbIds || [])
    return map
  }, [streamingProviders])

  const filteredMovies = useMemo(() => {
    let list = userMovies

    if (types.length < ALL_TYPES.length) {
      list = list.filter((m) => types.includes(m.type))
    }

    if (watchedList.length < WATCHED_VALUES.length) {
      list = list.filter((m) => matchesWatched(m, watchedList))
    }

    if (selectedGenres.length > 0) {
      const wanted = new Set(selectedGenres)
      list = list.filter((m) => (m.genres || []).some((g) => wanted.has(g)))
    }

    if (selectedProviders.length > 0) {
      const wantedIds = new Set()
      for (const key of selectedProviders) {
        for (const id of (providerTmdbIdsByKey.get(key) || [])) wantedIds.add(id)
      }
      if (wantedIds.size > 0) {
        list = list.filter((m) => (m.providers || []).some((id) => wantedIds.has(id)))
      }
    }

    const q = debouncedQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((m) => (m.title || '').toLowerCase().includes(q))
    }

    return sortMovies(list, sortBy)
  }, [userMovies, types, watched, selectedGenres, selectedProviders, providerTmdbIdsByKey, debouncedQuery, sortBy])

  const listKey = [
    types.join(','), watched, selectedGenres.join(','),
    selectedProviders.join(','), debouncedQuery.trim(), sortBy,
  ].join('|')
  const [activeListKey, setActiveListKey] = useState(listKey)

  // Ajuste de estado durante o render (padrão do React pra estado derivado):
  // reseta a janela junto com a troca de filtro. Com useEffect haveria um frame
  // exibindo a lista nova ainda fatiada pela contagem antiga.
  if (listKey !== activeListKey) {
    setActiveListKey(listKey)
    setVisibleCount(PAGE_SIZE)
  }

  const visibleMovies = filteredMovies.slice(0, visibleCount)
  const hasMore = visibleCount < filteredMovies.length
  const sentinelRef = useInfiniteScroll(
    () => setVisibleCount((c) => c + PAGE_SIZE),
    { enabled: hasMore }
  )

  // Compara o valor anterior (não um boolean de mount) pra não rolar no remonte
  // do StrictMode nem na primeira carga, só quando o filtro realmente muda.
  const prevListKey = useRef(listKey)
  useEffect(() => {
    if (prevListKey.current === listKey) return
    prevListKey.current = listKey
    window.scrollTo({ top: 0 })
  }, [listKey])

  const counts = useMemo(() => ({
    total:  filteredMovies.length,
    movies: filteredMovies.filter((m) => m.type === 'MOVIE').length,
    series: filteredMovies.filter((m) => m.type === 'SERIES').length,
  }), [filteredMovies])

  const isFiltered =
    types.length < ALL_TYPES.length ||
    watched !== '' ||
    selectedGenres.length > 0 ||
    selectedProviders.length > 0 ||
    debouncedQuery.trim() !== '' ||
    sortBy !== DEFAULT_SORT

  const activeFilterCount =
    (sortBy !== DEFAULT_SORT ? 1 : 0) +
    (watched ? 1 : 0) +
    selectedGenres.length +
    selectedProviders.length

  const emptyMessage = (() => {
    if (!isFiltered) return null
    if (watched === WATCHED_NONE) return 'Selecione ao menos um status para ver seus itens.'
    if (debouncedQuery.trim()) return `Nenhum item encontrado para "${debouncedQuery.trim()}".`
    if (watched === 'true')  return 'Você ainda não marcou nenhum item como assistido.'
    if (watched === 'false') return 'Nenhum item pendente para assistir.'
    return 'Nenhum item corresponde ao filtro selecionado.'
  })()

  const performDelete = async (movie) => {
    await removeMovie(movie)
    setConfirmingDeleteId(null)
  }

  const onAddFromModal = async (priority) => {
    const created = await addMovie(expandedItem, priority)
    if (created) setExpandedItemId(created.id)
  }

  const renderMovieCard = (movie) => {
    const isConfirming = confirmingDeleteId === movie.id

    if (viewMode === VIEW_MODES.POSTERS) {
      return (
        <DeleteConfirmWrap key={movie.id} movie={movie} confirming={isConfirming} onConfirm={() => performDelete(movie)}>
          <MovieCard
            item={movie}
            layout="poster"
            watched={movie.watched}
            ariaLabel={`${movie.title}. Tocar para remover da lista`}
            onClick={() => setConfirmingDeleteId(isConfirming ? null : movie.id)}
            posterOverlay={isConfirming ? null : <PosterDetailsButton onOpen={() => setExpandedItemId(movie.id)} />}
          />
        </DeleteConfirmWrap>
      )
    }

    return (
      <DeleteConfirmWrap key={movie.id} movie={movie} confirming={isConfirming} onConfirm={() => performDelete(movie)}>
        <MovieCard
          item={movie}
          watched={movie.watched}
          onClick={() => {
            if (isConfirming) {
              setConfirmingDeleteId(null)
              return
            }
            setExpandedItemId(movie.id)
          }}
          titleBadge={
            <span className={`ui-type-badge ui-type-badge--${movie.type.toLowerCase()}`}>
              {TYPE_LABEL[movie.type] ?? movie.type}
            </span>
          }
          posterOverlay={
            <WatchedToggle watched={movie.watched} onToggle={() => setWatched(movie)} />
          }
          actions={
            <AddToListButton
              inList
              currentPriority={movie.priority}
              onRemove={() => setConfirmingDeleteId(movie.id)}
              onChangePriority={(p) => setPriority(movie, p)}
            />
          }
        />
      </DeleteConfirmWrap>
    )
  }

  const desktopFilters = (
    <>
      <Segmented
        iconOnly
        selection="multiple"
        label="Status"
        options={WATCHED_OPTIONS}
        isActive={(option) => watchedList.includes(option.value)}
        onChange={toggleWatched}
      />

      {availableGenres.length > 0 && (
        <Dropdown
          multi
          trigger="button"
          align="right"
          label="Gênero"
          options={availableGenres}
          value={selectedGenres}
          onChange={setGenres}
        />
      )}

      {streamingOptions.length > 0 && (
        <Dropdown
          multi
          trigger="button"
          align="right"
          label="Streaming"
          options={streamingOptions}
          value={selectedProviders}
          onChange={setProviders}
        />
      )}
    </>
  )

  const pendingWatched = parseWatchedParam(filterSheet.pending.watched)

  const sheetFilters = (
    <>
      <SortCategoriesSection
        categories={SORT_CATEGORIES}
        value={filterSheet.pending.sortBy}
        onChange={(val) => filterSheet.setField('sortBy', val)}
      />

      <section className="filter-section">
        <span className="filter-section-label">Status</span>
        <div className="filter-chip-group">
          {WATCHED_OPTIONS.map(({ value, label, Icon }) => (
            <Button
              key={value}
              variant="filter"
              size="sm"
              pill
              icon={<Icon size={16} />}
              active={pendingWatched.includes(value)}
              onClick={() => filterSheet.setField('watched', encodeWatched(toggleInList(pendingWatched, value)))}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      {availableGenres.length > 0 && (
        <section className="filter-section">
          <span className="filter-section-label">Gênero</span>
          <Dropdown
            multi
            trigger="button"
            align="left"
            label="Selecionar"
            options={availableGenres}
            value={filterSheet.pending.genres}
            onChange={(val) => filterSheet.setField('genres', val)}
            emptyMessage="Nenhum gênero disponível"
          />
        </section>
      )}

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
            emptyMessage="Nenhum streaming disponível"
          />
        </section>
      )}
    </>
  )

  return (
    <div className="mylist-page">
      <div className="mylist-container">
        <Toolbar
          className="mylist-controls"
          search={
            <>
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar na lista..."
              />
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </>
          }
          scope={<TypeFilterPills value={types} onChange={setTypes} />}
          sort={<SortSegmented fields={SORT_FIELDS} value={sortBy} onChange={setSortBy} />}
          filters={desktopFilters}
          sheetTrigger={
            <FilterSheetTrigger
              count={activeFilterCount}
              onClick={() => filterSheet.openWith({
                sortBy, watched, genres: selectedGenres, providers: selectedProviders,
              })}
            />
          }
        />

        {!isLoading && counts.total > 0 && (
          <div className="mylist-count">
            <StatPills movies={counts.movies} series={counts.series} />
          </div>
        )}

        {isLoading ? (
          <div className="loading">Carregando...</div>
        ) : filteredMovies.length === 0 ? (
          isFiltered ? (
            <EmptyState description={emptyMessage} />
          ) : (
            <EmptyState
              title="Nenhum item adicionado ainda"
              description='Clique em "Adicionar" para buscar filmes e séries!'
              action={
                <button className="btn-add-empty" onClick={() => navigate(ROUTES.SEARCH)}>
                  <Plus size={18} /> Adicionar Primeiro Item
                </button>
              }
            />
          )
        ) : (
          <>
            <div className={viewMode === VIEW_MODES.POSTERS ? 'ui-poster-grid' : 'movies-grid'}>
              {visibleMovies.map(renderMovieCard)}
            </div>
            {hasMore && <div ref={sentinelRef} className="ui-infinite-sentinel" />}
          </>
        )}
      </div>

      {expandedItem && (
        <CardModal
          item={expandedItem}
          onClose={closeExpanded}
          posterOverlay={
            expandedLive
              ? <WatchedToggle watched={expandedLive.watched} onToggle={() => setWatched(expandedLive)} />
              : null
          }
          actions={
            <AddToListButton
              inList={Boolean(expandedLive)}
              currentPriority={expandedLive?.priority}
              compactPriority={false}
              onAdd={onAddFromModal}
              onRemove={() => performDelete(expandedLive)}
              onChangePriority={(p) => setPriority(expandedLive, p)}
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

export default MyList
