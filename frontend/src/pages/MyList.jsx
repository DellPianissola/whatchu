import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Film, Tv } from 'lucide-react'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { useMovieActions } from '../hooks/useMovieActions.js'
import CardModal from '../components/CardModal.jsx'
import MovieCard from '../components/MovieCard.jsx'
import WatchedToggle from '../components/WatchedToggle.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import TypeFilterPills, { ALL_TYPES } from '../components/TypeFilterPills.jsx'
import Dropdown from '../components/Dropdown.jsx'
import { ROUTES } from '../constants/routes.js'
import './MyList.css'

const WATCHED_OPTIONS = [
  { value: '',      label: 'Todos' },
  { value: 'false', label: 'Não assistidos' },
  { value: 'true',  label: 'Assistidos' },
]

const parseTypesParam = (csv) => {
  if (!csv) return ALL_TYPES
  const list = csv.split(',').filter((t) => ALL_TYPES.includes(t))
  return list.length > 0 ? list : ALL_TYPES
}

const MyList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userMovies, isLoading } = useUserMovies()
  const { addMovie, removeMovie, setPriority, setWatched } = useMovieActions()

  const types   = parseTypesParam(searchParams.get('types'))
  const watched = searchParams.get('watched') ?? ''

  const setTypes = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next.length === ALL_TYPES.length) params.delete('types')
    else                                  params.set('types', next.join(','))
    setSearchParams(params, { replace: true })
  }

  const setWatchedFilter = (next) => {
    const params = new URLSearchParams(searchParams)
    if (!next) params.delete('watched')
    else       params.set('watched', next)
    setSearchParams(params, { replace: true })
  }

  const [expandedItemId, setExpandedItemId] = useState(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  // expandedLive reage a toggles/priority; snapshot mantém o modal aberto após delete
  // (permite re-adicionar) ou se a lista re-fetch e o item ainda não voltou.
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

  const visibleMovies = useMemo(() => {
    const byType = types.length === ALL_TYPES.length
      ? userMovies
      : userMovies.filter((m) => types.includes(m.type))
    if (!watched) return byType
    const want = watched === 'true'
    return byType.filter((m) => Boolean(m.watched) === want)
  }, [userMovies, types, watched])

  const moviesByCategory = useMemo(() => ({
    movies: visibleMovies.filter((m) => m.type === 'MOVIE'),
    series: visibleMovies.filter((m) => m.type === 'SERIES'),
  }), [visibleMovies])

  const performDelete = async (movie) => {
    await removeMovie(movie)
    setConfirmingDeleteId(null)
  }

  const onAddFromModal = async (priority) => {
    const created = await addMovie(expandedItem, priority)
    if (created) setExpandedItemId(created.id)
  }

  const isFiltered = types.length < ALL_TYPES.length || watched !== ''

  const emptyMessage = (() => {
    if (!isFiltered) return null
    if (watched === 'true')  return 'Você ainda não marcou nenhum item como assistido.'
    if (watched === 'false') return 'Nenhum item pendente para assistir.'
    return 'Nenhum item corresponde ao filtro selecionado.'
  })()

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

  return (
    <div className="mylist-page">
      <div className="mylist-container">
        <div className="mylist-header">
          <h2>Minha Lista</h2>
          <button className="btn-add-new" onClick={() => navigate(ROUTES.SEARCH)}>
            <Plus size={18} /> Adicionar
          </button>
        </div>

        <div className="filters">
          <div className="filter-pills-row">
            <TypeFilterPills value={types} onChange={setTypes} />
          </div>

          <Dropdown
            trigger="button"
            align="left"
            label="Status"
            value={watched}
            onChange={setWatchedFilter}
            options={WATCHED_OPTIONS}
          />
        </div>

        {isLoading ? (
          <div className="loading">Carregando...</div>
        ) : visibleMovies.length === 0 ? (
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
          <div className="movies-by-category">
            {moviesByCategory.movies.length > 0 && (
              <div className="category-section">
                <h3 className="category-title"><Film size={20} /> Filmes ({moviesByCategory.movies.length})</h3>
                <div className="movies-grid">
                  {moviesByCategory.movies.map(renderMovieCard)}
                </div>
              </div>
            )}
            {moviesByCategory.series.length > 0 && (
              <div className="category-section">
                <h3 className="category-title"><Tv size={20} /> Séries ({moviesByCategory.series.length})</h3>
                <div className="movies-grid">
                  {moviesByCategory.series.map(renderMovieCard)}
                </div>
              </div>
            )}
          </div>
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
    </div>
  )
}

export default MyList
