import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMovies, deleteMovie, updateMovie } from '../services/api.js'
import { useNotify } from '../contexts/NotificationContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import CardModal from '../components/CardModal.jsx'
import TypeFilterPills, { ALL_TYPES } from '../components/TypeFilterPills.jsx'
import Dropdown from '../components/Dropdown.jsx'
import PriorityPicker from '../components/PriorityPicker.jsx'
import PriorityIndicator from '../components/PriorityIndicator.jsx'
import { useRichDetails } from '../hooks/useRichDetails.js'
import './MyList.css'

const MyList = () => {
  const navigate = useNavigate()
  const { toast } = useNotify()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ types: ALL_TYPES, watched: '' })
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  // expandedItem derivado do array — reage automaticamente a toggles e deletes
  const expandedItem = movies.find(m => m.id === expandedItemId) ?? null

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

  useEffect(() => {
    loadMovies()
  }, [filter.watched])

  const loadMovies = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.watched !== '') params.watched = filter.watched
      const response = await getMovies(params)
      setMovies(response.data.movies)
    } catch (error) {
      console.error('Erro ao carregar filmes:', error)
    } finally {
      setLoading(false)
    }
  }

  // tipo é client-side: multi-seleção; backend só aceita watched como filtro
  const visibleMovies = filter.types.length === ALL_TYPES.length
    ? movies
    : movies.filter(m => filter.types.includes(m.type))

  const performDelete = async (id) => {
    try {
      await deleteMovie(id)
      setExpandedItemId(null)
      setConfirmingDeleteId(null)
      setMovies(prev => prev.filter(m => m.id !== id))
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

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este item?')) return
    await performDelete(id)
  }

  const handleChangePriority = async (movie, priority) => {
    if (movie.priority === priority) return
    try {
      await updateMovie(movie.id, { priority })
      setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, priority } : m))
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error)
      toast.error('Erro ao atualizar prioridade')
    }
  }

  const handleToggleWatched = async (movie) => {
    const newWatched = !movie.watched
    try {
      await updateMovie(movie.id, { watched: newWatched })
      setMovies(prev => {
        // filtro ativo e novo estado diverge → retira da view sem refetch
        if (filter.watched !== '' && String(newWatched) !== filter.watched) {
          return prev.filter(m => m.id !== movie.id)
        }
        return prev.map(m => m.id === movie.id ? { ...m, watched: newWatched } : m)
      })
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      toast.error('Erro ao atualizar item')
    }
  }

  const moviesByCategory = {
    movies: visibleMovies.filter(m => m.type === 'MOVIE'),
    series: visibleMovies.filter(m => m.type === 'SERIES'),
    animes: visibleMovies.filter(m => m.type === 'ANIME'),
  }

  const renderMovieCard = (movie) => {
    const genresText = movie.genres?.length > 0 ? movie.genres.join(', ') : 'Sem gênero'

    return (
      <div
        key={movie.id}
        data-card-id={movie.id}
        className={`movie-card ${movie.watched ? 'watched' : ''} ${confirmingDeleteId === movie.id ? 'movie-card--deleting' : ''}`}
        onClick={() => {
          if (confirmingDeleteId === movie.id) {
            setConfirmingDeleteId(null)
            return
          }
          setExpandedItemId(movie.id)
        }}
      >
        <div className="movie-poster-container">
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title} className="movie-poster" />
          ) : (
            <PosterPlaceholder title={movie.title} type={movie.type} className="movie-poster" />
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleToggleWatched(movie) }}
            className={`card-overlay-btn card-overlay-btn--watched ${movie.watched ? 'card-overlay-btn--watched-on' : ''}`}
            title={movie.watched ? 'Marcar como não assistido' : 'Marcar como assistido'}
          >
            {movie.watched ? '✓' : '👁'}
          </button>
        </div>
        <div className="movie-info">
          <div className="movie-header">
            <h3>{movie.title}</h3>
            {movie.isNew && <span className="new-badge">NOVO</span>}
          </div>
          <div className="movie-footer">
            <div className="movie-meta">
              <span>📅 {movie.year || 'Sem data'}</span>
              <span>⭐ {movie.rating || 'Sem nota'}</span>
              <span className="genres-span" title={genresText}>🎭 {genresText}</span>
            </div>
            <div className="movie-card-actions">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRequestDelete(movie.id) }}
                className={`btn-remove-from-list ${confirmingDeleteId === movie.id ? 'btn-remove-from-list--confirming' : ''}`}
              >
                {confirmingDeleteId === movie.id ? 'Confirmar' : '🗑️ Remover'}
              </button>
              <PriorityIndicator
                value={movie.priority}
                onChange={(priority) => handleChangePriority(movie, priority)}
              />
            </div>
          </div>
        </div>
        {confirmingDeleteId === movie.id && (
          <div className="card-delete-overlay">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); performDelete(movie.id) }}
              className="card-delete-icon"
              title="Confirmar remoção"
            >
              🗑️
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
          <button className="btn-add-new" onClick={() => navigate('/search')}>
            ➕ Adicionar
          </button>
        </div>

        <div className="filters">
          <div className="filter-pills-row">
            <TypeFilterPills
              value={filter.types}
              onChange={(types) => setFilter({ ...filter, types })}
            />
          </div>

          <Dropdown
            trigger="button"
            align="left"
            label="Status"
            value={filter.watched}
            onChange={(watched) => setFilter({ ...filter, watched })}
            options={[
              { value: '',      label: 'Todos' },
              { value: 'false', label: 'Não assistidos' },
              { value: 'true',  label: 'Assistidos' },
            ]}
          />
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : visibleMovies.length === 0 ? (
          <div className="empty-state">
            {filter.types.length < ALL_TYPES.length || filter.watched ? (
              <p>
                {filter.watched === 'true'
                  ? 'Você ainda não marcou nenhum item como assistido.'
                  : filter.watched === 'false'
                  ? 'Nenhum item pendente para assistir.'
                  : 'Nenhum item corresponde ao filtro selecionado.'}
              </p>
            ) : (
              <>
                <p>Nenhum item adicionado ainda</p>
                <p className="empty-hint">Clique em "Adicionar" para buscar filmes, séries e animes!</p>
                <button className="btn-add-empty" onClick={() => navigate('/search')}>
                  ➕ Adicionar Primeiro Item
                </button>
              </>
            )}
          </div>
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
            {moviesByCategory.animes.length > 0 && (
              <div className="category-section">
                <h3 className="category-title">🎌 Animes ({moviesByCategory.animes.length})</h3>
                <div className="movies-grid">
                  {moviesByCategory.animes.map(renderMovieCard)}
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
            <button
              type="button"
              onClick={() => handleToggleWatched(expandedItem)}
              className={`card-overlay-btn card-overlay-btn--watched ${expandedItem.watched ? 'card-overlay-btn--watched-on' : ''}`}
              title={expandedItem.watched ? 'Marcar como não assistido' : 'Marcar como assistido'}
            >
              {expandedItem.watched ? '✓' : '👁'}
            </button>
          }
          actions={
            <div className="modal-actions-stack">
              <PriorityPicker
                value={expandedItem.priority}
                onChange={(priority) => handleChangePriority(expandedItem, priority)}
              />
              <button
                onClick={() => handleDelete(expandedItem.id)}
                className="btn-remove-from-list"
              >
                🗑️ Remover da lista
              </button>
            </div>
          }
        />
      )}
    </div>
  )
}

export default MyList
