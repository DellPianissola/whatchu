import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMovies, drawMovie, luckyDraw, getExternalGenres } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import WatchuLogo from '../components/WatchuLogo.jsx'
import CardModal from '../components/CardModal.jsx'
import TypeFilterPills, { ALL_TYPES } from '../components/TypeFilterPills.jsx'
import Dropdown from '../components/Dropdown.jsx'
import { useRichDetails } from '../hooks/useRichDetails.js'
import { TYPE_LABEL, PRIORITY_LABEL, formatDuration } from '../utils/content.js'
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
  const [filterPriorities, setFilterPriorities] = useState([])
  const [filterGenres, setFilterGenres] = useState([])
  const [genresByType, setGenresByType] = useState({ MOVIE: [], SERIES: [], ANIME: [] })
  const [ignoreWatched, setIgnoreWatched] = useState(false)

  // opções fixas — não dependem de dados da API
  const PRIORITY_OPTIONS = [
    { value: 'LOW',    label: PRIORITY_LABEL.LOW    },
    { value: 'MEDIUM', label: PRIORITY_LABEL.MEDIUM },
    { value: 'HIGH',   label: PRIORITY_LABEL.HIGH   },
    { value: 'URGENT', label: PRIORITY_LABEL.URGENT },
  ]

  const { richDetails, richDetailsLoading, richDetailsError } = useRichDetails(modalOpen ? selectedMovie : null)

  useEffect(() => {
    setIsLoaded(true)
    loadStats()
    loadGenres()
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
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const loadGenres = async () => {
    try {
      const [movie, series, anime] = await Promise.all([
        getExternalGenres('movie'),
        getExternalGenres('series'),
        getExternalGenres('anime'),
      ])
      setGenresByType({
        MOVIE:  movie.data.genres,
        SERIES: series.data.genres,
        ANIME:  anime.data.genres,
      })
    } catch (error) {
      console.error('Erro ao carregar gêneros:', error)
    }
  }

  const availableGenres = useMemo(() => {
    const set = new Set()
    filterTypes.forEach(t => (genresByType[t] || []).forEach(g => set.add(g)))
    return [...set].sort()
  }, [filterTypes, genresByType])

  const handleDraw = async () => {
    setIsDrawing(true)
    setSelectedMovie(null)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const response = await drawMovie({
        types: filterTypes,
        priorities: filterPriorities,
        genres: filterGenres,
        ignoreWatched,
      })
      setSelectedMovie(response.data.movie)
    } catch (error) {
      const code = error.response?.data?.code
      if (code === 'EMPTY_LIST') {
        toast.info('Sua lista está vazia — adicione filmes, séries ou animes pra começar')
      } else if (code === 'NO_MATCH') {
        toast.info('Nenhum item da sua lista corresponde aos filtros selecionados')
      } else {
        toast.error('Erro ao sortear. Tente novamente.')
      }
    } finally {
      setIsDrawing(false)
    }
  }

  const handleLucky = async () => {
    setIsDrawing(true)
    setSelectedMovie(null)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const response = await luckyDraw({
        types: filterTypes,
        genres: filterGenres,
      })
      if (response.data.movie) {
        setSelectedMovie(response.data.movie)
      } else {
        toast.info('Não rolou achar nada com esses filtros. Tente outros gêneros ou tipos.')
      }
    } catch (error) {
      toast.error('Erro ao sortear. Tente novamente.')
    } finally {
      setIsDrawing(false)
    }
  }

  const handleGroup = () => {
    toast.info('Em breve — você vai poder sortear com os amigos!')
  }

  const greeting = profile?.name ? `Olá, ${profile.name.split(' ')[0]}!` : 'Bem-vindo!'
  const totalItems = stats.movies + stats.series + stats.animes
  const listIsEmpty = !isLoadingStats && totalItems === 0
  const noTypeSelected = filterTypes.length === 0
  const drawDisabled = isDrawing || noTypeSelected

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
                <Dropdown
                  multi
                  trigger="pill"
                  align="left"
                  label="Prioridade"
                  options={PRIORITY_OPTIONS}
                  value={filterPriorities}
                  onChange={setFilterPriorities}
                />
                {availableGenres.length > 0 && (
                  <Dropdown
                    multi
                    trigger="pill"
                    align="left"
                    label="Gênero"
                    options={availableGenres}
                    value={filterGenres}
                    onChange={setFilterGenres}
                  />
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
                    disabled={drawDisabled}
                    title={noTypeSelected ? 'Selecione ao menos um tipo (Filme, Série ou Anime)' : undefined}
                  >
                    <span className="btn-icon">🎲</span>
                    <span className="btn-text">{isDrawing ? 'Sorteando...' : 'Sortear'}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-lucky"
                    onClick={handleLucky}
                    disabled={drawDisabled}
                    title={noTypeSelected ? 'Selecione ao menos um tipo (Filme, Série ou Anime)' : undefined}
                  >
                    <span className="btn-icon">✨</span>
                    <span className="btn-text">{isDrawing ? 'Sorteando...' : 'Estou com sorte'}</span>
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
                      {TYPE_LABEL[selectedMovie.type] ?? selectedMovie.type}
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
          richDetailsError={richDetailsError}
          onClose={() => setModalOpen(false)}
          actions={null}
        />
      )}
    </div>
  )
}

export default Home
