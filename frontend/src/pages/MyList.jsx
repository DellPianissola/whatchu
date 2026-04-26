import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMovies, deleteMovie, updateMovie } from '../services/api.js'
import { useNotify } from '../contexts/NotificationContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import './MyList.css'

const MyList = () => {
  const navigate = useNavigate()
  const { toast } = useNotify()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    type: '',
    watched: '',
  })

  useEffect(() => {
    loadMovies()
  }, [filter])

  const loadMovies = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.type) params.type = filter.type
      if (filter.watched !== '') params.watched = filter.watched

      const response = await getMovies(params)
      setMovies(response.data.movies)
    } catch (error) {
      console.error('Erro ao carregar filmes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este filme?')) return

    try {
      await deleteMovie(id)
      loadMovies()
      toast.success('Filme removido da lista')
    } catch (error) {
      console.error('Erro ao remover filme:', error)
      toast.error('Erro ao remover filme')
    }
  }

  const handleToggleWatched = async (movie) => {
    try {
      await updateMovie(movie.id, {
        watched: !movie.watched,
      })
      loadMovies()
    } catch (error) {
      console.error('Erro ao atualizar filme:', error)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return '#ef4444'
      case 'HIGH': return '#f59e0b'
      case 'MEDIUM': return '#3b82f6'
      case 'LOW': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'URGENT': return 'Urgente'
      case 'HIGH': return 'Alta'
      case 'MEDIUM': return 'Média'
      case 'LOW': return 'Baixa'
      default: return priority
    }
  }

  // Organiza filmes por categoria
  const moviesByCategory = {
    movies: movies.filter(m => m.type === 'MOVIE'),
    series: movies.filter(m => m.type === 'SERIES'),
    animes: movies.filter(m => m.type === 'ANIME'),
  }

  const renderMovieCard = (movie) => {
    const genresText = movie.genres && movie.genres.length > 0 
      ? movie.genres.join(', ') 
      : 'Sem gênero'
    const genresDisplay = movie.genres && movie.genres.length > 0 
      ? movie.genres.join(', ') 
      : 'Sem gênero'

    return (
      <div key={movie.id} className={`movie-card ${movie.watched ? 'watched' : ''}`}>
        <div className="movie-poster-container">
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title} className="movie-poster" />
          ) : (
            <PosterPlaceholder 
              title={movie.title} 
              type={movie.type}
              className="movie-poster"
            />
          )}
          <span className="movie-type-badge">
            {movie.type === 'MOVIE' ? 'Filme' : 
             movie.type === 'SERIES' ? 'Série' : 
             movie.type === 'ANIME' ? 'Anime' : movie.type}
          </span>
        </div>
        <div className="movie-info">
          <div className="movie-header">
            <h3>{movie.title}</h3>
            {movie.isNew && <span className="new-badge">NOVO</span>}
          </div>
          <div className="movie-footer-info">
            <div className="priority-badge" style={{ backgroundColor: getPriorityColor(movie.priority) }}>
              {getPriorityLabel(movie.priority)}
            </div>
            <span className="added-by">Por: {movie.addedBy?.name || 'Desconhecido'}</span>
          </div>
          <div className="movie-footer">
            <div className="movie-meta">
              <span>📅 {movie.year || 'Sem data'}</span>
              <span>⭐ {movie.rating || 'Sem nota'}</span>
              <span 
                className="genres-span"
                title={genresText}
              >
                🎭 {genresDisplay}
              </span>
            </div>
            <div className="movie-actions">
              <button
                onClick={() => handleToggleWatched(movie)}
                className={`btn-toggle ${movie.watched ? 'watched' : ''}`}
              >
                {movie.watched ? '✅ Assistido' : '⭕ Não assistido'}
              </button>
              <button
                onClick={() => handleDelete(movie.id)}
                className="btn-delete"
              >
                🗑️ Remover
              </button>
            </div>
          </div>
      </div>
    </div>
    )
  }

  return (
    <div className="mylist-page">
      <div className="mylist-container">
        <div className="mylist-header">
          <h2>Minha Lista</h2>
          <button 
            className="btn-add-new"
            onClick={() => navigate('/search')}
          >
            ➕ Adicionar
          </button>
        </div>

        <div className="filters">
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="filter-select"
          >
            <option value="">Todos os tipos</option>
            <option value="MOVIE">Filmes</option>
            <option value="SERIES">Séries</option>
            <option value="ANIME">Animes</option>
          </select>

          <select
            value={filter.watched}
            onChange={(e) => setFilter({ ...filter, watched: e.target.value })}
            className="filter-select"
          >
            <option value="">Todos</option>
            <option value="false">Não assistidos</option>
            <option value="true">Assistidos</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : movies.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum filme adicionado ainda</p>
            <p className="empty-hint">Clique em "Adicionar" para buscar e adicionar filmes à sua lista!</p>
            <button 
              className="btn-add-empty"
              onClick={() => navigate('/search')}
            >
              ➕ Adicionar Primeiro Filme
            </button>
          </div>
        ) : (
          <div className="movies-by-category">
            {/* Filmes */}
            {moviesByCategory.movies.length > 0 && (
              <div className="category-section">
                <h3 className="category-title">🎬 Filmes ({moviesByCategory.movies.length})</h3>
                <div className="movies-grid">
                  {moviesByCategory.movies.map((movie) => (
                    renderMovieCard(movie)
                  ))}
                </div>
              </div>
            )}

            {/* Séries */}
            {moviesByCategory.series.length > 0 && (
              <div className="category-section">
                <h3 className="category-title">📺 Séries ({moviesByCategory.series.length})</h3>
                <div className="movies-grid">
                  {moviesByCategory.series.map((movie) => (
                    renderMovieCard(movie)
                  ))}
                </div>
              </div>
            )}

            {/* Animes */}
            {moviesByCategory.animes.length > 0 && (
              <div className="category-section">
                <h3 className="category-title">🎌 Animes ({moviesByCategory.animes.length})</h3>
                <div className="movies-grid">
                  {moviesByCategory.animes.map((movie) => (
                    renderMovieCard(movie)
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyList

