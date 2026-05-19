import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import CardModal from '../components/CardModal.jsx'
import MovieCard from '../components/MovieCard.jsx'
import WatchedToggle from '../components/WatchedToggle.jsx'
import MovieListActions from '../components/MovieListActions.jsx'
import EmptyState from '../components/EmptyState.jsx'
import TypeFilterPills, { ALL_TYPES } from '../components/TypeFilterPills.jsx'
import Dropdown from '../components/Dropdown.jsx'
import { useRichDetails } from '../hooks/useRichDetails.js'
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
  const { toast } = useNotify()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userMovies, isLoading, removeFromList, changePriority, toggleWatched } = useUserMovies()

  const types   = parseTypesParam(searchParams.get('types'))
  const watched = searchParams.get('watched') ?? ''

  const setTypes = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next.length === ALL_TYPES.length) params.delete('types')
    else                                  params.set('types', next.join(','))
    setSearchParams(params, { replace: true })
  }

  const setWatched = (next) => {
    const params = new URLSearchParams(searchParams)
    if (!next) params.delete('watched')
    else       params.set('watched', next)
    setSearchParams(params, { replace: true })
  }

  const [expandedItemId, setExpandedItemId] = useState(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  // expandedItem derivado do array — reage automaticamente a toggles e deletes
  const expandedItem = userMovies.find((m) => m.id === expandedItemId) ?? null

  const { richDetails, richDetailsLoading, richDetailsError } = useRichDetails(expandedItem)

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

  const performDelete = async (id) => {
    try {
      await removeFromList(id)
      setExpandedItemId(null)
      setConfirmingDeleteId(null)
      toast.success('Item removido da lista')
    } catch (error) {
      console.error('Erro ao remover:', error)
      toast.error('Erro ao remover item')
    }
  }

  const handleRequestDelete = (id) => {
    if (confirmingDeleteId === id) performDelete(id)
    else                            setConfirmingDeleteId(id)
  }

  const handleChangePriority = async (movie, priority) => {
    if (movie.priority === priority) return
    try {
      await changePriority(movie.id, priority)
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error)
      toast.error('Erro ao atualizar prioridade')
    }
  }

  const handleToggleWatched = async (movie) => {
    try {
      await toggleWatched(movie)
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      toast.error('Erro ao atualizar item')
    }
  }

  const isFiltered = types.length < ALL_TYPES.length || watched !== ''

  const emptyMessage = (() => {
    if (!isFiltered) return null
    if (watched === 'true')  return 'Você ainda não marcou nenhum item como assistido.'
    if (watched === 'false') return 'Nenhum item pendente para assistir.'
    return 'Nenhum item corresponde ao filtro selecionado.'
  })()

  const renderMovieCard = (movie) => (
    <div
      key={movie.id}
      data-card-id={movie.id}
      className={confirmingDeleteId === movie.id ? 'ui-movie-card-wrap ui-movie-card-wrap--deleting' : 'ui-movie-card-wrap'}
    >
      <MovieCard
        item={movie}
        watched={movie.watched}
        onClick={() => {
          if (confirmingDeleteId === movie.id) {
            setConfirmingDeleteId(null)
            return
          }
          setExpandedItemId(movie.id)
        }}
        posterOverlay={
          <WatchedToggle watched={movie.watched} onToggle={() => handleToggleWatched(movie)} />
        }
        titleBadge={movie.isNew && <span className="new-badge">NOVO</span>}
        actions={
          <MovieListActions
            movie={movie}
            isConfirmingDelete={confirmingDeleteId === movie.id}
            onRequestDelete={() => handleRequestDelete(movie.id)}
            onRemove={() => performDelete(movie.id)}
            onChangePriority={(p) => handleChangePriority(movie, p)}
          />
        }
      />
    </div>
  )

  return (
    <div className="mylist-page">
      <div className="mylist-container">
        <div className="mylist-header">
          <h2>Minha Lista</h2>
          <button className="btn-add-new" onClick={() => navigate(ROUTES.SEARCH)}>
            ➕ Adicionar
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
            onChange={setWatched}
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
                  ➕ Adicionar Primeiro Item
                </button>
              }
            />
          )
        ) : (
          <div className="movies-by-category">
            {moviesByCategory.movies.length > 0 && (
              <div className="category-section">
                <h3 className="category-title">🎬 Filmes ({moviesByCategory.movies.length})</h3>
                <div className="movies-grid">
                  {moviesByCategory.movies.map(renderMovieCard)}
                </div>
              </div>
            )}
            {moviesByCategory.series.length > 0 && (
              <div className="category-section">
                <h3 className="category-title">📺 Séries ({moviesByCategory.series.length})</h3>
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
          richDetails={richDetails}
          richDetailsLoading={richDetailsLoading}
          richDetailsError={richDetailsError}
          onClose={() => setExpandedItemId(null)}
          posterOverlay={
            <WatchedToggle watched={expandedItem.watched} onToggle={() => handleToggleWatched(expandedItem)} />
          }
          actions={
            <MovieListActions
              movie={expandedItem}
              isConfirmingDelete={confirmingDeleteId === expandedItem.id}
              onRequestDelete={() => handleRequestDelete(expandedItem.id)}
              onRemove={() => performDelete(expandedItem.id)}
              onChangePriority={(p) => handleChangePriority(expandedItem, p)}
            />
          }
        />
      )}
    </div>
  )
}

export default MyList
