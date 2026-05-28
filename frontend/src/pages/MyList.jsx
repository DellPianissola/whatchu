import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Calendar, Clapperboard, Flame, Star, Type, ArrowDown, ArrowUp } from 'lucide-react'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { useMovieActions } from '../hooks/useMovieActions.js'
import CardModal from '../components/CardModal.jsx'
import MovieCard from '../components/MovieCard.jsx'
import WatchedToggle from '../components/WatchedToggle.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import TypeFilterPills, { ALL_TYPES } from '../components/TypeFilterPills.jsx'
import Dropdown from '../components/Dropdown.jsx'
import StatPills from '../components/StatPills.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import FilterSheetTrigger from '../components/FilterSheetTrigger.jsx'
import SortCategoriesSection from '../components/SortCategoriesSection.jsx'
import Button from '../components/Button.jsx'
import Pagination from '../components/Pagination.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import { useStreamingProviders } from '../hooks/useStreamingProviders.js'
import { ROUTES } from '../constants/routes.js'
import { SEARCH_DEBOUNCE_MS } from '../constants/ui.js'
import { TYPE_LABEL } from '../utils/content.js'
import { parseCsvParam } from '../utils/queryParams.js'
import { cycleSort, getSortIcon } from '../utils/sort.jsx'
import './MyList.css'

const PAGE_SIZE = 20
const DEFAULT_SORT = 'added_desc'

const PRIORITY_ORDER = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

const VALID_SORTS = [
  'added_asc',    'added_desc',
  'release_asc',  'release_desc',
  'priority_asc', 'priority_desc',
  'rating_asc',   'rating_desc',
  'title_asc',    'title_desc',
]

const SORT_CATEGORIES = [
  {
    Icon: Calendar,
    label: 'Adicionado',
    options: [
      { value: 'added_asc',  ariaLabel: 'Adicionado há mais tempo', Icon: ArrowDown },
      { value: 'added_desc', ariaLabel: 'Adicionado recentemente',  Icon: ArrowUp   },
    ],
  },
  {
    Icon: Clapperboard,
    label: 'Lançamento',
    options: [
      { value: 'release_asc',  ariaLabel: 'Lançamento mais antigo',   Icon: ArrowDown },
      { value: 'release_desc', ariaLabel: 'Lançamento mais recente',  Icon: ArrowUp   },
    ],
  },
  {
    Icon: Flame,
    label: 'Prioridade',
    options: [
      { value: 'priority_asc',  ariaLabel: 'Baixa prioridade primeiro', Icon: ArrowDown },
      { value: 'priority_desc', ariaLabel: 'Alta prioridade primeiro',  Icon: ArrowUp   },
    ],
  },
  {
    Icon: Star,
    label: 'Nota',
    options: [
      { value: 'rating_asc',  ariaLabel: 'Menor nota primeiro', Icon: ArrowDown },
      { value: 'rating_desc', ariaLabel: 'Maior nota primeiro', Icon: ArrowUp   },
    ],
  },
  {
    Icon: Type,
    label: 'Título',
    options: [
      { value: 'title_asc',  ariaLabel: 'A a Z', Icon: ArrowDown },
      { value: 'title_desc', ariaLabel: 'Z a A', Icon: ArrowUp   },
    ],
  },
]

const WATCHED_OPTIONS = [
  { value: '',      label: 'Todos' },
  { value: 'false', label: 'Não assistidos' },
  { value: 'true',  label: 'Assistidos' },
]

const SORT_FIELDS = [
  { field: 'added',    label: 'Adicionado',  Icon: Calendar },
  { field: 'release',  label: 'Lançamento',  Icon: Clapperboard },
  { field: 'priority', label: 'Prioridade',  Icon: Flame },
  { field: 'rating',   label: 'Nota',        Icon: Star },
  { field: 'title',    label: 'Título',      Icon: Type },
]

const splitSort = (sortBy) => {
  const [field, dir] = (sortBy || '').split('_')
  return { field: field || null, dir: dir || null }
}

const parseTypesParam = (csv) => {
  if (csv === null) return ALL_TYPES
  if (csv === '') return []
  const list = csv.split(',').filter((t) => ALL_TYPES.includes(t))
  return list
}

const parseSortParam = (value) => VALID_SORTS.includes(value) ? value : null

const parsePageParam = (value) => {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

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

const MyList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userMovies, isLoading } = useUserMovies()
  const { addMovie, removeMovie, setPriority, setWatched } = useMovieActions()

  const types          = parseTypesParam(searchParams.get('types'))
  const watched        = searchParams.get('watched') ?? ''
  const sortBy         = parseSortParam(searchParams.get('sortBy')) ?? DEFAULT_SORT
  const selectedGenres    = parseCsvParam(searchParams.get('genres'))
  const selectedProviders = parseCsvParam(searchParams.get('providers'))
  const currentPage    = parsePageParam(searchParams.get('page'))

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  const { providers: streamingProviders, options: streamingOptions } = useStreamingProviders()

  const [expandedItemId, setExpandedItemId] = useState(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

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
    next.delete('page')
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

  const setCurrentPage = (page) => {
    const next = new URLSearchParams(searchParams)
    if (page === 1) next.delete('page')
    else next.set('page', String(page))
    setSearchParams(next, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const setSortBy = (value) => updateParams((next) => {
    if (!value || value === DEFAULT_SORT) next.delete('sortBy')
    else next.set('sortBy', value)
  })

  const setWatchedFilter = (value) => updateParams((next) => {
    if (!value) next.delete('watched')
    else next.set('watched', value)
  })

  const setGenres = (arr) => updateParams((next) => {
    if (!arr || arr.length === 0) next.delete('genres')
    else next.set('genres', arr.join(','))
  })

  const setProviders = (arr) => updateParams((next) => {
    if (!arr || arr.length === 0) next.delete('providers')
    else next.set('providers', arr.join(','))
  })

  const { field: activeSortField, dir: activeSortDir } = splitSort(sortBy)

  const toggleSort = (field) => {
    if (field !== activeSortField) {
      setSortBy(`${field}_desc`)
      return
    }
    const next = cycleSort(activeSortDir)
    setSortBy(next === null ? null : `${field}_${next}`)
  }

  const filterSheet = useFilterSheet({
    defaults: { sortBy: DEFAULT_SORT, watched: '', genres: [], providers: [] },
    onCommit: commitSheetFiltersToUrl,
  })

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

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

    if (watched) {
      const want = watched === 'true'
      list = list.filter((m) => Boolean(m.watched) === want)
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

  const totalPages = Math.max(1, Math.ceil(filteredMovies.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages)
  const pagedMovies = useMemo(
    () => filteredMovies.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredMovies, safePage]
  )

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
    return (
      <div
        key={movie.id}
        data-card-id={movie.id}
        className={isConfirming ? 'ui-movie-card-wrap ui-movie-card-wrap--deleting' : 'ui-movie-card-wrap'}
      >
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
        {isConfirming && (
          <div className="card-delete-overlay">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); performDelete(movie) }}
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
  }

  const desktopFilters = (
    <div className="mylist-sort-filters">
      <div className="sort-segmented" role="group" aria-label="Ordenar por">
        {SORT_FIELDS.map(({ field, label, Icon }) => (
          <button
            key={field}
            type="button"
            onClick={() => toggleSort(field)}
            className={`sort-seg-btn ${activeSortField === field ? 'active' : ''}`}
          >
            <Icon size={14} />
            <span>{label}</span>
            <span className="sort-seg-arrow" aria-hidden>
              {activeSortField === field ? getSortIcon(activeSortDir) : null}
            </span>
          </button>
        ))}
      </div>

      <div className="mylist-filter-group">
        <Dropdown
          trigger="button"
          align="right"
          label="Status"
          options={WATCHED_OPTIONS}
          value={watched || null}
          onChange={setWatchedFilter}
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
      </div>
    </div>
  )

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
          {WATCHED_OPTIONS.map((opt) => (
            <Button
              key={opt.value || 'all'}
              variant="filter"
              size="sm"
              pill
              active={filterSheet.pending.watched === opt.value}
              onClick={() => filterSheet.setField('watched', opt.value)}
            >
              {opt.label}
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
        <div className="mylist-controls">
          <div className="mylist-search">
            <input
              type="text"
              className="ui-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar na lista..."
            />
          </div>

          <div className="mylist-types">
            <TypeFilterPills value={types} onChange={setTypes} />
          </div>

          {desktopFilters}

          <FilterSheetTrigger
            count={activeFilterCount}
            onClick={() => filterSheet.openWith({
              sortBy, watched, genres: selectedGenres, providers: selectedProviders,
            })}
          />
        </div>

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
            <div className="movies-grid">
              {pagedMovies.map(renderMovieCard)}
            </div>
            {totalPages > 1 && (
              <Pagination current={safePage} total={totalPages} onChange={setCurrentPage} />
            )}
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
