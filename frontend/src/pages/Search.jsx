import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchExternal, createMovie, getMovies, deleteMovie, getPopularMovies, getPopularSeries, getPopularAnimes, getExternalGenres } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import './Search.css'

const parsePageParam = (value) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

const VALID_TYPES = ['movie', 'series', 'anime']
const parseTypeParam = (value) => {
  return VALID_TYPES.includes(value) ? value : 'movie'
}

const VALID_SORTS = ['date_asc', 'date_desc', 'rating_asc', 'rating_desc']
const parseSortParam = (value) => {
  return VALID_SORTS.includes(value) ? value : null
}

const parseGenresParam = (value) => {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

// Deriva (sortDate, sortRating) a partir do sortBy unificado
const splitSort = (sortBy) => {
  if (sortBy === 'date_asc') return { sortDate: 'asc', sortRating: null }
  if (sortBy === 'date_desc') return { sortDate: 'desc', sortRating: null }
  if (sortBy === 'rating_asc') return { sortDate: null, sortRating: 'asc' }
  if (sortBy === 'rating_desc') return { sortDate: null, sortRating: 'desc' }
  return { sortDate: null, sortRating: null }
}

const ONBOARDING_TARGET = 3

const Search = ({ mode = 'page', onComplete, onSkip }) => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const isOnboarding = mode === 'onboarding'
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [addingMovie, setAddingMovie] = useState(null)
  const [userMovies, setUserMovies] = useState([])
  const [availableGenres, setAvailableGenres] = useState([])
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const debounceTimer = useRef(null)
  const genreDropdownRef = useRef(null)

  // URL é a fonte de verdade para `type`, `currentPage`, `sortBy` e `genres`
  const type = parseTypeParam(searchParams.get('type'))
  const currentPage = parsePageParam(searchParams.get('page'))
  const sortBy = parseSortParam(searchParams.get('sortBy'))
  const selectedGenres = parseGenresParam(searchParams.get('genres'))
  const { sortDate, sortRating } = splitSort(sortBy)

  // Busca textual no TMDB (filme/série) NÃO suporta sort/gênero — desabilitamos a UI
  const textSearchActive = query.trim().length > 0
  const sortAndGenreDisabled = textSearchActive && type !== 'anime'

  const updateParams = (mutate, { resetPage = false } = {}) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }

  const setType = (newType) => {
    updateParams((next) => {
      if (newType === 'movie') next.delete('type')
      else next.set('type', newType)
      next.delete('genres') // gêneros são por-tipo; reseta ao trocar
    }, { resetPage: true })
  }

  const setCurrentPage = (newPage) => {
    updateParams((next) => {
      if (newPage === 1) next.delete('page')
      else next.set('page', String(newPage))
    })
  }

  const setSortBy = (value) => {
    updateParams((next) => {
      if (!value) next.delete('sortBy')
      else next.set('sortBy', value)
    }, { resetPage: true })
  }

  const setSelectedGenres = (arr) => {
    updateParams((next) => {
      if (!arr || arr.length === 0) next.delete('genres')
      else next.set('genres', arr.join(','))
    }, { resetPage: true })
  }

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target)) {
        setShowGenreDropdown(false)
      }
    }

    if (showGenreDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showGenreDropdown])

  // Carrega filmes do usuário para verificar duplicatas
  useEffect(() => {
    const loadUserMovies = async () => {
      try {
        const response = await getMovies()
        setUserMovies(response.data.movies)
      } catch (error) {
        console.error('Erro ao carregar filmes do usuário:', error)
      }
    }
    if (profile) {
      loadUserMovies()
    }
  }, [profile])

  // Carrega lista de gêneros disponíveis para o tipo atual
  useEffect(() => {
    let cancelled = false
    const loadGenres = async () => {
      try {
        const response = await getExternalGenres(type)
        if (!cancelled) setAvailableGenres(response.data.genres || [])
      } catch (error) {
        console.error('Erro ao carregar gêneros:', error)
        if (!cancelled) setAvailableGenres([])
      }
    }
    loadGenres()
    return () => { cancelled = true }
  }, [type])

  // Reseta página quando query muda (mudança de tipo/sort/gênero já reseta nos setters)
  const prevQueryRef = useRef(query)
  useEffect(() => {
    if (prevQueryRef.current === query) return
    prevQueryRef.current = query
    if (currentPage !== 1) setCurrentPage(1)
  }, [query])

  // Busca automática com debounce ou carrega populares
  const genresKey = selectedGenres.join(',')
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    const doFetch = async () => {
      setLoading(true)
      try {
        if (!query.trim()) {
          await loadPopular(currentPage, sortBy, selectedGenres)
        } else {
          await loadSearch(query, type, currentPage, sortBy, selectedGenres)
        }
      } finally {
        setLoading(false)
      }
    }

    if (!query.trim()) {
      // Popular: sem debounce
      doFetch()
    } else {
      // Busca: debounce de 500ms
      debounceTimer.current = setTimeout(doFetch, 500)
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query, type, currentPage, sortBy, genresKey])

  const loadPopular = async (page, sort, genres) => {
    try {
      const opts = { sortBy: sort || undefined, genres }
      let response

      if (type === 'movie') {
        response = await getPopularMovies(page, opts)
      } else if (type === 'series') {
        response = await getPopularSeries(page, opts)
      } else {
        response = await getPopularAnimes(page, opts)
      }

      setResults(response.data.results || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error) {
      console.error('Erro ao carregar conteúdo popular:', error)
      setResults([])
      setTotalPages(1)
    }
  }

  const loadSearch = async (q, searchType, page, sort, genres) => {
    try {
      // TMDB /search ignora sort/gênero; Jikan suporta
      const opts = searchType === 'anime'
        ? { sortBy: sort || undefined, genres }
        : {}
      const response = await searchExternal(q, searchType, page, opts)
      setResults(response.data.results || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error) {
      console.error('Erro ao buscar:', error)
      setResults([])
      setTotalPages(1)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    // A busca já é automática, mas mantemos o form para UX
  }

  // Verifica se o filme já está na lista do usuário
  const isMovieInList = (movie) => {
    return userMovies.some(userMovie => {
      // Compara por externalId se disponível, senão por título
      if (movie.externalId && userMovie.externalId) {
        return userMovie.externalId === movie.externalId.toString()
      }
      return userMovie.title.toLowerCase() === movie.title.toLowerCase() &&
             userMovie.type === (movie.type === 'MOVIE' ? 'MOVIE' : 
                                movie.type === 'SERIES' ? 'SERIES' : 
                                movie.type === 'ANIME' ? 'ANIME' : movie.type)
    })
  }

  const handleAddMovie = async (movie) => {
    if (!profile) {
      toast.error('Perfil não encontrado!')
      return
    }

    // Verifica se já está na lista
    if (isMovieInList(movie)) {
      // Remove o filme
      const userMovie = userMovies.find(userMovie => {
        if (movie.externalId && userMovie.externalId) {
          return userMovie.externalId === movie.externalId.toString()
        }
        return userMovie.title.toLowerCase() === movie.title.toLowerCase()
      })

      if (userMovie) {
        setAddingMovie(movie.id)
        try {
          await deleteMovie(userMovie.id)
          setUserMovies(userMovies.filter(m => m.id !== userMovie.id))
          toast.success(`"${movie.title}" removido da lista`)
        } catch (error) {
          console.error('Erro ao remover filme:', error)
          toast.error(error.response?.data?.error || 'Erro ao remover filme')
        } finally {
          setAddingMovie(null)
        }
      }
      return
    }

    setAddingMovie(movie.id)
    try {
      // Mapeia o tipo para o formato esperado pelo backend
      const typeMap = {
        'MOVIE': 'MOVIE',
        'SERIES': 'SERIES',
        'ANIME': 'ANIME',
        'movie': 'MOVIE',
        'series': 'SERIES',
        'anime': 'ANIME',
      }
      
      const movieData = {
        title: movie.title,
        type: typeMap[movie.type] || movie.type,
        description: movie.description,
        poster: movie.poster,
        year: movie.year,
        duration: movie.duration,
        genres: movie.genres || [],
        rating: movie.rating,
        externalId: movie.externalId?.toString(),
        priority: 'MEDIUM',
        isNew: true,
      }

      const response = await createMovie(movieData)
      setUserMovies([...userMovies, response.data.movie])
      toast.success(`"${movie.title}" adicionado à lista`)
    } catch (error) {
      console.error('Erro ao adicionar filme:', error)
      toast.error(error.response?.data?.error || 'Erro ao adicionar filme')
    } finally {
      setAddingMovie(null)
    }
  }

  // Sort/filtro agora são feitos pela API (URL → backend). Front renderiza o que vier.
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const toggleGenre = (genre) => {
    const next = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre]
    setSelectedGenres(next)
  }

  const cycleSort = (current) => {
    if (current === null) return 'desc'
    if (current === 'desc') return 'asc'
    return null
  }

  const toggleSortDate = () => {
    const next = cycleSort(sortDate)
    setSortBy(next === null ? null : `date_${next}`)
  }

  const toggleSortRating = () => {
    const next = cycleSort(sortRating)
    setSortBy(next === null ? null : `rating_${next}`)
  }

  const buildPageList = (current, total) => {
    const WINDOW_SIZE = 5

    if (total <= WINDOW_SIZE) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }

    // Janela deslizante de 5 páginas centralizada na atual (com clamp nas bordas)
    let start = current - Math.floor(WINDOW_SIZE / 2)
    let end   = start + WINDOW_SIZE - 1

    if (start < 1) {
      start = 1
      end = WINDOW_SIZE
    }
    if (end > total) {
      end = total
      start = total - WINDOW_SIZE + 1
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const getSortIcon = (sortState) => {
    if (sortState === 'asc') return '↑'
    if (sortState === 'desc') return '↓'
    return ''
  }

  // Cálculos do modo onboarding
  const onboardingCount = userMovies.length
  const onboardingProgress = Math.min(onboardingCount, ONBOARDING_TARGET)
  const onboardingComplete = onboardingCount >= ONBOARDING_TARGET
  const onboardingRemaining = Math.max(ONBOARDING_TARGET - onboardingCount, 0)

  return (
    <div className={`search-page ${isOnboarding ? 'search-page-onboarding' : ''}`}>
      {isOnboarding && (
        <div className="onboarding-header">
          <div className="onboarding-header-content">
            <div className="onboarding-header-text">
              <h2>Bem-vindo!</h2>
              <p>
                Adicione pelo menos {ONBOARDING_TARGET} filmes, séries ou animes pra
                ativar o sorteio e começar a usar o app.
              </p>
            </div>
            <button
              type="button"
              className="onboarding-skip-link"
              onClick={() => onSkip?.()}
            >
              Pular por agora
            </button>
          </div>
          <div className="onboarding-progress">
            <div className="onboarding-progress-text">
              {onboardingComplete
                ? `Pronto! ${onboardingCount} ${onboardingCount === 1 ? 'item adicionado' : 'itens adicionados'}`
                : `${onboardingProgress} de ${ONBOARDING_TARGET} ${onboardingProgress === 1 ? 'adicionado' : 'adicionados'}`}
            </div>
            <div className="onboarding-progress-bar">
              <div
                className="onboarding-progress-fill"
                style={{ width: `${(onboardingProgress / ONBOARDING_TARGET) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="search-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-header">
            <div className="search-type-filters">
              <button
                type="button"
                onClick={() => setType('movie')}
                className={`filter-btn ${type === 'movie' ? 'active' : ''}`}
              >
                🎬 Filmes
              </button>
              <button
                type="button"
                onClick={() => setType('series')}
                className={`filter-btn ${type === 'series' ? 'active' : ''}`}
              >
                📺 Séries
              </button>
              <button
                type="button"
                onClick={() => setType('anime')}
                className={`filter-btn ${type === 'anime' ? 'active' : ''}`}
              >
                🎌 Animes
              </button>
            </div>
            
            <div className="search-input-group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do filme, série ou anime..."
                className="search-input"
              />
            </div>

            <div className="search-sort-filters">
              <div className="sort-buttons">
                <button
                  type="button"
                  onClick={toggleSortDate}
                  disabled={sortAndGenreDisabled}
                  title={sortAndGenreDisabled ? 'Indisponível durante busca por texto' : ''}
                  className={`sort-btn ${sortDate ? 'active' : ''}`}
                >
                  📅 Data {getSortIcon(sortDate)}
                </button>
                <button
                  type="button"
                  onClick={toggleSortRating}
                  disabled={sortAndGenreDisabled}
                  title={sortAndGenreDisabled ? 'Indisponível durante busca por texto' : ''}
                  className={`sort-btn ${sortRating ? 'active' : ''}`}
                >
                  ⭐ Nota {getSortIcon(sortRating)}
                </button>
              </div>

              <div className="genre-dropdown-wrapper" ref={genreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                  disabled={sortAndGenreDisabled}
                  title={sortAndGenreDisabled ? 'Indisponível durante busca por texto' : ''}
                  className="genre-dropdown-btn"
                >
                  🎭 Gêneros {selectedGenres.length > 0 && `(${selectedGenres.length})`}
                </button>
                {showGenreDropdown && (
                  <div className="genre-dropdown">
                    {availableGenres.length > 0 ? (
                      availableGenres.map(genre => (
                        <label key={genre} className="genre-option">
                          <input
                            type="checkbox"
                            checked={selectedGenres.includes(genre)}
                            onChange={() => toggleGenre(genre)}
                          />
                          <span>{genre}</span>
                        </label>
                      ))
                    ) : (
                      <div className="genre-dropdown-empty">Nenhum gênero disponível</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>


        {loading && (
          <div className="results-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="result-card skeleton-card">
                <div className="result-poster-container">
                  <div className="skeleton-poster"></div>
                </div>
                <div className="result-info">
                  <div className="skeleton-title"></div>
                  <div className="result-footer">
                    <div className="result-meta">
                      <div className="skeleton-meta"></div>
                      <div className="skeleton-meta"></div>
                      <div className="skeleton-meta"></div>
                    </div>
                    <div className="skeleton-button"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="results-grid">
            {results.map((item) => {
              const genresText = item.genres && item.genres.length > 0 
                ? item.genres.join(', ') 
                : 'Sem gênero'
              const genresDisplay = item.genres && item.genres.length > 0 
                ? item.genres.join(', ') 
                : 'Sem gênero'

              return (
                <div key={item.id} className="result-card">
                  <div className="result-poster-container">
                    {item.poster ? (
                      <img src={item.poster} alt={item.title} className="result-poster" />
                    ) : (
                      <PosterPlaceholder 
                        title={item.title} 
                        type={item.type}
                        className="result-poster"
                      />
                    )}
                    <span className="result-type-badge">
                      {item.type === 'MOVIE' ? 'Filme' : 
                       item.type === 'SERIES' ? 'Série' : 
                       item.type === 'ANIME' ? 'Anime' : item.type}
                    </span>
                  </div>
                  <div className="result-info">
                    <h3>{item.title}</h3>
                    <div className="result-footer">
                      <div className="result-meta">
                        <span>📅 {item.year || 'Sem data'}</span>
                        <span>⭐ {item.rating || 'Sem nota'}</span>
                        <span 
                          className="genres-span"
                          title={genresText}
                        >
                          🎭 {genresDisplay}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddMovie(item)}
                        disabled={!profile || addingMovie === item.id}
                        className={`btn-add ${isMovieInList(item) ? 'btn-remove' : ''}`}
                      >
                        {addingMovie === item.id 
                          ? 'Processando...' 
                          : isMovieInList(item) 
                            ? '🗑️ Remover' 
                            : '➕ Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && (
          <div className="pagination">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              « Início
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ‹ Anterior
            </button>

            <div className="pagination-pages">
              {buildPageList(currentPage, totalPages).map((entry, idx) =>
                entry === '...'
                  ? <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                  : (
                    <button
                      key={entry}
                      onClick={() => goToPage(entry)}
                      className={`pagination-page ${currentPage === entry ? 'active' : ''}`}
                    >
                      {entry}
                    </button>
                  )
              )}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Próximo ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Último »
            </button>
          </div>
        )}

        {!loading && results.length === 0 && (
          <p className="no-results">
            {query ? 'Nenhum resultado encontrado' : 'Nenhum conteúdo popular encontrado'}
          </p>
        )}
      </div>

      {isOnboarding && (
        <div className="onboarding-footer">
          <button
            type="button"
            className={`onboarding-cta ${onboardingComplete ? 'onboarding-cta-ready' : ''}`}
            onClick={() => onComplete?.()}
            disabled={!onboardingComplete}
          >
            {onboardingComplete
              ? 'Continuar →'
              : `Adicione mais ${onboardingRemaining} ${onboardingRemaining === 1 ? 'item' : 'itens'}`}
          </button>
        </div>
      )}
    </div>
  )
}

export default Search

