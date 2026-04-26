import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchExternal, createMovie, getMovies, deleteMovie, getPopularMovies, getPopularSeries, getPopularAnimes } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import './Search.css'

const parsePageParam = (value) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

const Search = () => {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('movie')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(() => parsePageParam(searchParams.get('page')))
  const [addingMovie, setAddingMovie] = useState(null)
  const [userMovies, setUserMovies] = useState([])
  const [sortDate, setSortDate] = useState(null) // null, 'asc', 'desc'
  const [sortRating, setSortRating] = useState(null) // null, 'asc', 'desc'
  const [selectedGenres, setSelectedGenres] = useState([])
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const debounceTimer = useRef(null)
  const genreDropdownRef = useRef(null)

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

  // Limpa gêneros selecionados ao mudar o tipo
  useEffect(() => {
    setSelectedGenres([])
  }, [type])

  // Reseta para página 1 apenas quando query ou tipo realmente mudam
  const prevQueryRef = useRef(query)
  const prevTypeRef = useRef(type)
  useEffect(() => {
    if (prevQueryRef.current === query && prevTypeRef.current === type) return
    prevQueryRef.current = query
    prevTypeRef.current = type
    setCurrentPage(1)
  }, [query, type])

  // Sincroniza currentPage → URL (?page=N)
  useEffect(() => {
    const urlPage = parsePageParam(searchParams.get('page'))
    if (urlPage === currentPage) return

    const next = new URLSearchParams(searchParams)
    if (currentPage === 1) {
      next.delete('page')
    } else {
      next.set('page', String(currentPage))
    }
    setSearchParams(next, { replace: false })
  }, [currentPage])

  // Sincroniza URL → currentPage (suporta voltar/avançar do navegador)
  useEffect(() => {
    const urlPage = parsePageParam(searchParams.get('page'))
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage)
    }
  }, [searchParams])

  // Busca automática com debounce ou carrega populares
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    const doFetch = async () => {
      setLoading(true)
      try {
        if (!query.trim()) {
          await loadPopular(currentPage)
        } else {
          await loadSearch(query, type, currentPage)
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
  }, [query, type, currentPage])

  const loadPopular = async (page) => {
    try {
      let response

      if (type === 'movie') {
        response = await getPopularMovies(page)
      } else if (type === 'series') {
        response = await getPopularSeries(page)
      } else {
        response = await getPopularAnimes(page)
      }

      setResults(response.data.results || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error) {
      console.error('Erro ao carregar conteúdo popular:', error)
      setResults([])
      setTotalPages(1)
    }
  }

  const loadSearch = async (q, searchType, page) => {
    try {
      const response = await searchExternal(q, searchType, page)
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
      alert('Perfil não encontrado!')
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
        } catch (error) {
          console.error('Erro ao remover filme:', error)
          alert(error.response?.data?.error || 'Erro ao remover filme')
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
    } catch (error) {
      console.error('Erro ao adicionar filme:', error)
      alert(error.response?.data?.error || 'Erro ao adicionar filme')
    } finally {
      setAddingMovie(null)
    }
  }

  // Extrai gêneros únicos dos resultados
  const allGenres = [...new Set(results.flatMap(item => item.genres || []))].sort()

  // Filtra e ordena os resultados
  const filteredAndSortedResults = results
    .filter(item => {
      // Filtro por gêneros
      if (selectedGenres.length > 0) {
        const itemGenres = item.genres || []
        return selectedGenres.some(genre => itemGenres.includes(genre))
      }
      return true
    })
    .sort((a, b) => {
      let result = 0
      
      // Ordenação por data
      if (sortDate) {
        const dateA = a.year || 0
        const dateB = b.year || 0
        if (sortDate === 'asc') {
          result = dateA - dateB
        } else if (sortDate === 'desc') {
          result = dateB - dateA
        }
        // Se o resultado da data for diferente de zero, retorna
        if (result !== 0) return result
      }
      
      // Ordenação por nota (se a data não diferenciar ou não estiver ativa)
      if (sortRating) {
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (sortRating === 'asc') {
          result = ratingA - ratingB
        } else if (sortRating === 'desc') {
          result = ratingB - ratingA
        }
      }
      
      return result
    })

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const toggleGenre = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    )
  }

  const toggleSortDate = () => {
    setSortDate(prev => {
      if (prev === null) {
        setSortRating(null) // Desativa o outro filtro
        return 'desc'
      }
      if (prev === 'desc') return 'asc'
      return null
    })
  }

  const toggleSortRating = () => {
    setSortRating(prev => {
      if (prev === null) {
        setSortDate(null) // Desativa o outro filtro
        return 'desc'
      }
      if (prev === 'desc') return 'asc'
      return null
    })
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

  return (
    <div className="search-page">
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
                  className={`sort-btn ${sortDate ? 'active' : ''}`}
                >
                  📅 Data {getSortIcon(sortDate)}
                </button>
                <button
                  type="button"
                  onClick={toggleSortRating}
                  className={`sort-btn ${sortRating ? 'active' : ''}`}
                >
                  ⭐ Nota {getSortIcon(sortRating)}
                </button>
              </div>
              
              <div className="genre-dropdown-wrapper" ref={genreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                  className="genre-dropdown-btn"
                >
                  🎭 Gêneros {selectedGenres.length > 0 && `(${selectedGenres.length})`}
                </button>
                {showGenreDropdown && (
                  <div className="genre-dropdown">
                    {allGenres.length > 0 ? (
                      allGenres.map(genre => (
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

        {!loading && filteredAndSortedResults.length > 0 && (
          <div className="results-grid">
            {filteredAndSortedResults.map((item) => {
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

        {!loading && totalPages > 1 && (
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

        {!loading && filteredAndSortedResults.length === 0 && (
          <p className="no-results">
            {query ? 'Nenhum resultado encontrado' : 'Nenhum conteúdo popular encontrado'}
          </p>
        )}
      </div>
    </div>
  )
}

export default Search

