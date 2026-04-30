import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getMovies, drawMovie } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import WatchuLogo from '../components/WatchuLogo.jsx'
import CardModal from '../components/CardModal.jsx'
import TypeFilterPills, { ALL_TYPES } from '../components/TypeFilterPills.jsx'
import { useRichDetails } from '../hooks/useRichDetails.js'
import './Home.css'

const Home = () => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [stats, setStats] = useState({ movies: 0, series: 0, animes: 0 })
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterTypes, setFilterTypes] = useState(ALL_TYPES)
  const [filterGenres, setFilterGenres] = useState([])
  const [availableGenres, setAvailableGenres] = useState([])
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [ignoreWatched, setIgnoreWatched] = useState(false)
  const genreDropdownRef = useRef(null)

  const { richDetails, richDetailsLoading } = useRichDetails(modalOpen ? selectedMovie : null)

  useEffect(() => {
    setIsLoaded(true)
    loadStats()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const loadStats = async () => {
    try {
      const response = await getMovies()
      const movies = response.data.movies
      setStats({
        movies: movies.filter(m => m.type === 'MOVIE').length,
        series: movies.filter(m => m.type === 'SERIES').length,
        animes: movies.filter(m => m.type === 'ANIME').length,
      })
      const genres = [...new Set(movies.flatMap(m => m.genres ?? []))].sort()
      setAvailableGenres(genres)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    if (!showGenreDropdown) return
    const handler = (e) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target)) {
        setShowGenreDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showGenreDropdown])

  const toggleGenre = (genre) => {
    setFilterGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handleDraw = async () => {
    setIsDrawing(true)
    setSelectedMovie(null)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      // TODO (backend): passar { types: filterTypes, ignoreWatched, genres: filterGenres }
      const response = await drawMovie()
      setSelectedMovie(response.data.movie)
    } catch (error) {
      if (error.response?.status === 404) {
        toast.info('Sua lista está vazia — adicione filmes, séries ou animes pra começar')
      } else {
        toast.error('Erro ao sortear. Tente novamente.')
      }
    } finally {
      setIsDrawing(false)
    }
  }

  const handleLucky = () => {
    toast.info('Em breve — vai descobrir algo novo fora da sua lista!')
  }

  const handleGroup = () => {
    toast.info('Em breve — você vai poder sortear com os amigos!')
  }

  const formatDuration = (minutes) => {
    if (!minutes) return null
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h${m}min`
  }

  const greeting = profile?.name ? `Olá, ${profile.name.split(' ')[0]}!` : 'Bem-vindo!'
  const totalItems = stats.movies + stats.series + stats.animes
  const listIsEmpty = !isLoadingStats && totalItems === 0

  return (
    <div className="home">
      <div className="cinema-bg">
        {[...Array(18)].map((_, i) => (
          <div key={i} className={`glow-dot glow-dot-${i + 1}`} />
        ))}
      </div>

      <div className={`home-content ${isLoaded ? 'loaded' : ''}`}>
        <header className="home-header">
          <div className="logo">
            <WatchuLogo size={72} />
            <h1 className="logo-text">What<span className="logo-chu">chu</span></h1>
          </div>
          <p className="tagline">O que vamos assistir hoje?</p>
        </header>

        <div className="main-card">

          {/* Coluna esquerda — controles */}
          <div className="card-left">
            <div className="card-header">
              <h2>{greeting}</h2>
            </div>

            <div className="stats-preview">
              <div className="stat-item">
                <div className="stat-value">{isLoadingStats ? '—' : stats.movies}</div>
                <div className="stat-label">Filmes</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-value">{isLoadingStats ? '—' : stats.series}</div>
                <div className="stat-label">Séries</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-value">{isLoadingStats ? '—' : stats.animes}</div>
                <div className="stat-label">Animes</div>
              </div>
            </div>

            <div className="draw-filters">
              <div className="draw-filter-row">
                <TypeFilterPills value={filterTypes} onChange={setFilterTypes} />
                {availableGenres.length > 0 && (
                  <div className="genre-filter-wrapper" ref={genreDropdownRef}>
                    <button
                      className={`filter-pill genre-pill ${filterGenres.length > 0 ? 'active' : ''}`}
                      onClick={() => setShowGenreDropdown(v => !v)}
                    >
                      Gênero {filterGenres.length > 0 ? `(${filterGenres.length})` : '▾'}
                    </button>
                    {showGenreDropdown && (
                      <div className="genre-dropdown-home">
                        {availableGenres.map(genre => (
                          <label key={genre} className="genre-option-home">
                            <input
                              type="checkbox"
                              checked={filterGenres.includes(genre)}
                              onChange={() => toggleGenre(genre)}
                            />
                            <span>{genre}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <label className="draw-toggle-label">
                <input
                  type="checkbox"
                  checked={ignoreWatched}
                  onChange={(e) => setIgnoreWatched(e.target.checked)}
                  className="draw-toggle-input"
                />
                <span className="draw-toggle-track" />
                <span className="draw-toggle-text">Ignorar já assistidos</span>
              </label>
            </div>

            <div className="card-actions">
              {listIsEmpty ? (
                <div className="empty-list-state">
                  <p className="empty-list-text">
                    Sua lista está vazia. Pesquise filmes, séries ou animes para começar.
                  </p>
                  <Link to="/search" className="btn btn-primary btn-draw">
                    <span className="btn-icon">🔍</span>
                    <span className="btn-text">Pesquisar conteúdo</span>
                  </Link>
                </div>
              ) : (
                <div className="action-buttons-main">
                  <button
                    className="btn btn-primary btn-draw"
                    onClick={handleDraw}
                    disabled={isDrawing}
                  >
                    <span className="btn-icon">🎲</span>
                    <span className="btn-text">{isDrawing ? 'Sorteando...' : 'Sortear'}</span>
                  </button>
                  <button className="btn btn-ghost btn-lucky" onClick={handleLucky}>
                    <span className="btn-icon">✨</span>
                    <span className="btn-text">Estou com sorte</span>
                    <span className="btn-soon">em breve</span>
                  </button>
                </div>
              )}

              <div className="group-row">
                <button className="btn-group" onClick={handleGroup}>
                  👥 Formar grupo
                  <span className="btn-soon btn-soon--inline">em breve</span>
                </button>
              </div>
            </div>
          </div>

          {/* Coluna direita — poster ou placeholder */}
          <div className="card-right">
            {selectedMovie ? (
              <div className="draw-result-panel" onClick={() => setModalOpen(true)}>
                {selectedMovie.poster ? (
                  <img src={selectedMovie.poster} alt={selectedMovie.title} className="draw-result-bg" />
                ) : (
                  <PosterPlaceholder
                    title={selectedMovie.title}
                    type={selectedMovie.type}
                    className="draw-result-bg"
                  />
                )}
                <div className="draw-result-top">
                  <span className="draw-result-label">🎉 Sorteado!</span>
                  <button className="btn-close-draw" onClick={(e) => { e.stopPropagation(); setSelectedMovie(null); setModalOpen(false) }}>✕</button>
                </div>
                <div className="draw-result-content">
                  <div className="draw-result-meta">
                    <span className="draw-type">
                      {selectedMovie.type === 'MOVIE' ? 'Filme' :
                       selectedMovie.type === 'SERIES' ? 'Série' : 'Anime'}
                    </span>
                    {selectedMovie.year && <span className="draw-meta-item">📅 {selectedMovie.year}</span>}
                    {selectedMovie.rating && <span className="draw-meta-item">⭐ {selectedMovie.rating}</span>}
                    {selectedMovie.type === 'MOVIE' && selectedMovie.duration && <span className="draw-meta-item">⏱ {formatDuration(selectedMovie.duration)}</span>}
                  </div>
                  <h4 className="draw-result-title">{selectedMovie.title}</h4>
                  {selectedMovie.genres?.length > 0 && (
                    <p className="draw-result-genres">{selectedMovie.genres.join(', ')}</p>
                  )}
                  {selectedMovie.description && (
                    <p className="draw-result-description">{selectedMovie.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className={`draw-placeholder ${isDrawing ? 'drawing' : ''}`}>
                <div className="geo-ring geo-ring--1" />
                <div className="geo-ring geo-ring--2" />
                <div className="geo-ring geo-ring--3" />
                <div className="geo-triangle geo-triangle--1" />
                <div className="geo-triangle geo-triangle--2" />
                <div className="geo-bar geo-bar--1" />
                <div className="geo-bar geo-bar--2" />
                <div className="geo-dot geo-dot--1" />
                <div className="geo-dot geo-dot--2" />
                <div className="placeholder-hint">
                  {isDrawing ? 'Sorteando...' : 'O sorteado aparece aqui'}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {modalOpen && selectedMovie && (
        <CardModal
          item={selectedMovie}
          richDetails={richDetails}
          richDetailsLoading={richDetailsLoading}
          onClose={() => setModalOpen(false)}
          actions={null}
        />
      )}
    </div>
  )
}

export default Home
