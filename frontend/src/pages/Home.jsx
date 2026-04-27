import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMovies, drawMovie } from '../services/api.js'
import { useNotify } from '../contexts/NotificationContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import WatchuLogo from '../components/WatchuLogo.jsx'
import './Home.css'

const Home = () => {
  const { toast } = useNotify()
  const [isLoaded, setIsLoaded] = useState(false)
  const [stats, setStats] = useState({ movies: 0, series: 0, animes: 0 })
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setIsLoaded(true)
    loadStats()
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
    }
  }

  const handleDraw = async () => {
    setIsDrawing(true)
    setSelectedMovie(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const response = await drawMovie()
      setSelectedMovie(response.data.movie)
    } catch (error) {
      if (error.response?.status === 404) {
        toast.info('Sua lista está vazia — adicione filmes, séries ou animes pra começar')
      } else {
        toast.error('Erro ao sortear filme. Tente novamente.')
      }
    } finally {
      setIsDrawing(false)
    }
  }

  return (
    <div className="home">
      {/* Cinema Background */}
      <div className="cinema-bg">
        {[...Array(18)].map((_, i) => (
          <div key={i} className={`glow-dot glow-dot-${i + 1}`} />
        ))}
      </div>

      {/* Main Content */}
      <div className={`home-content ${isLoaded ? 'loaded' : ''}`}>
        {/* Header */}
        <header className="home-header">
          <div className="logo">
            <WatchuLogo size={72} />
            <h1 className="logo-text">What<span className="logo-chu">chu</span></h1>
          </div>
          <p className="tagline">O que assistir hoje?</p>
        </header>

        {/* Main Card */}
        <div className="main-card">
          <div className="card-header">
            <h2>Bem-vindos!</h2>
            <p className="subtitle">O que vamos assistir hoje?</p>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons-main">
            <button
              className="btn btn-primary btn-draw"
              onClick={handleDraw}
              disabled={isDrawing}
            >
              <span className="btn-icon">🎲</span>
              <span className="btn-text">{isDrawing ? 'Sorteando...' : 'Sortear'}</span>
            </button>
            <button
              className="btn btn-secondary btn-list"
              onClick={() => navigate('/list')}
            >
              <span className="btn-icon">📋</span>
              <span className="btn-text">Minha Lista</span>
            </button>
          </div>

          {/* Resultado do Sorteio */}
          {selectedMovie && (
            <div className="draw-result">
              <div className="draw-result-header">
                <h3>🎉 Sorteado!</h3>
                <button 
                  className="btn-close-draw"
                  onClick={() => setSelectedMovie(null)}
                >
                  ✕
                </button>
              </div>
              <div className="draw-result-content">
                {selectedMovie.poster ? (
                  <img src={selectedMovie.poster} alt={selectedMovie.title} className="draw-poster" />
                ) : (
                  <PosterPlaceholder 
                    title={selectedMovie.title} 
                    type={selectedMovie.type}
                    className="draw-poster"
                  />
                )}
                <div className="draw-info">
                  <h4>{selectedMovie.title}</h4>
                  <p className="draw-type">
                    {selectedMovie.type === 'MOVIE' ? 'Filme' : 
                     selectedMovie.type === 'SERIES' ? 'Série' : 
                     'Anime'}
                  </p>
                  {selectedMovie.description && (
                    <p className="draw-description">{selectedMovie.description}</p>
                  )}
                  <div className="draw-actions">
                    <button 
                      className="btn-watch-now"
                      onClick={() => navigate('/list')}
                    >
                      Ver na Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Preview */}
          <div className="stats-preview">
            <div className="stat-item">
              <div className="stat-value">{stats.movies}</div>
              <div className="stat-label">Filmes</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">{stats.series}</div>
              <div className="stat-label">Séries</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">{stats.animes}</div>
              <div className="stat-label">Animes</div>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Perfis</h3>
            <p>Cada um adiciona seus favoritos</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⭐</div>
            <h3>Prioridades</h3>
            <p>Organize por importância</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🆕</div>
            <h3>Novidades</h3>
            <p>Fique por dentro do que é novo</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Sorteio Inteligente</h3>
            <p>Algoritmo que considera preferências</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="home-footer">
          <p>Feito com ❤️ para assistir juntos</p>
        </footer>
      </div>
    </div>
  )
}

export default Home

