import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchExternal, createMovie, getMovies, deleteMovie, updateMovie, getPopularMovies, getPopularSeries, getPopularAnimes, getExternalGenres } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import CardModal from '../components/CardModal.jsx'
import Dropdown from '../components/Dropdown.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import PriorityPicker from '../components/PriorityPicker.jsx'
import { useRichDetails } from '../hooks/useRichDetails.js'
import { TYPE_LABEL, PRIORITY_LABEL } from '../utils/content.js'
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
  const [expandedItem, setExpandedItem] = useState(null)
  const [modalPriority, setModalPriority] = useState('MEDIUM')
  const { richDetails, richDetailsLoading, richDetailsError } = useRichDetails(expandedItem)
  const debounceTimer = useRef(null)

  // URL é fonte de verdade — type/page/sortBy/genres nunca em useState
  const type = parseTypeParam(searchParams.get('type'))
  const currentPage = parsePageParam(searchParams.get('page'))
  const sortBy = parseSortParam(searchParams.get('sortBy'))
  const selectedGenres = parseGenresParam(searchParams.get('genres'))
  const { sortDate, sortRating } = splitSort(sortBy)

  // TMDB /search não suporta sort/gênero — UI desabilitada nesses casos
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
      next.delete('genres') // gêneros são por-tipo
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

  useEffect(() => {
    if (expandedItem) setModalPriority('MEDIUM')
  }, [expandedItem])

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

  // reseta página ao mudar query; tipo/sort/gênero já resetam nos próprios setters
  const prevQueryRef = useRef(query)
  useEffect(() => {
    if (prevQueryRef.current === query) return
    prevQueryRef.current = query
    if (currentPage !== 1) setCurrentPage(1)
  }, [query])

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
      doFetch()
    } else {
      debounceTimer.current = setTimeout(doFetch, 500) // debounce 500ms só na busca textual
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
      notifyExternalError(error, type)
    }
  }

  const loadSearch = async (q, searchType, page, sort, genres) => {
    try {
      // Jikan suporta sort/gênero na busca; TMDB não
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
      notifyExternalError(error, searchType)
    }
  }

  const notifyExternalError = (error, searchType) => {
    const source = searchType === 'anime' ? 'MyAnimeList' : 'TMDB'
    const code   = error.response?.data?.code

    if (!error.response) {
      toast.error('Sem conexão com o servidor. Tenta de novo em alguns segundos.')
    } else if (code === 'UPSTREAM_RATE_LIMIT') {
      toast.error(`${source} está limitando as requisições. Aguarda um momento e tenta de novo.`)
    } else if (code === 'UPSTREAM_DOWN') {
      toast.error(`${source} está fora do ar agora. Tenta de novo daqui a pouco.`)
    } else {
      toast.error('Erro ao buscar conteúdo. Tenta de novo.')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    // busca é automática via useEffect; form existe pra UX (Enter, mobile submit)
  }

  const findUserMovie = (movie) => userMovies.find(userMovie => {
    // externalId preferível; fallback por título+tipo
    if (movie.externalId && userMovie.externalId) {
      return userMovie.externalId === movie.externalId.toString()
    }
    return userMovie.title.toLowerCase() === movie.title.toLowerCase() &&
           userMovie.type === (movie.type === 'MOVIE'  ? 'MOVIE'
                            :  movie.type === 'SERIES' ? 'SERIES'
                            :  movie.type === 'ANIME'  ? 'ANIME'
                            :  movie.type)
  })

  const isMovieInList = (movie) => Boolean(findUserMovie(movie))

  const handleRemoveMovie = async (movie) => {
    const userMovie = findUserMovie(movie)
    if (!userMovie) return

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

  const handleChangePriority = async (movie, priority) => {
    const userMovie = findUserMovie(movie)
    if (!userMovie || userMovie.priority === priority) return
    try {
      await updateMovie(userMovie.id, { priority })
      setUserMovies(prev => prev.map(m => m.id === userMovie.id ? { ...m, priority } : m))
      toast.success(`Prioridade alterada para ${PRIORITY_LABEL[priority]}`)
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error)
      toast.error('Erro ao atualizar prioridade')
    }
  }

  const handleAddMovie = async (movie, priority = 'MEDIUM') => {
    if (!profile) {
      toast.error('Perfil não encontrado!')
      return
    }

    if (isMovieInList(movie)) return

    setAddingMovie(movie.id)
    try {
      // normaliza tipo: API externa usa lowercase, backend espera uppercase
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
        priority,
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

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
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

    // janela de 5 centralizada na página atual, clampada nas bordas
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
    <div className={`search-page ${isOnboarding ? 'search-page-onboarding' : ''}`}>
      {isOnboarding && (
        <OnboardingHeader
          count={userMovies.length}
          target={ONBOARDING_TARGET}
          onSkip={() => onSkip?.()}
          onComplete={() => onComplete?.()}
        />
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

              <Dropdown
                multi
                trigger="button"
                align="right"
                icon="🎭"
                label="Gêneros"
                options={availableGenres}
                value={selectedGenres}
                onChange={setSelectedGenres}
                disabled={sortAndGenreDisabled}
                disabledTitle="Indisponível durante busca por texto"
                emptyMessage="Nenhum gênero disponível"
              />
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
                <div key={item.id} className="result-card" onClick={() => setExpandedItem(item)}>
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
                      {TYPE_LABEL[item.type] ?? item.type}
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
                      <AddToListButton
                        inList={isMovieInList(item)}
                        currentPriority={findUserMovie(item)?.priority}
                        processing={addingMovie === item.id}
                        disabled={!profile}
                        onAdd={(priority) => handleAddMovie(item, priority)}
                        onChangePriority={(priority) => handleChangePriority(item, priority)}
                        onRemove={() => handleRemoveMovie(item)}
                      />
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

      {expandedItem && (
        <CardModal
          item={expandedItem}
          richDetails={richDetails}
          richDetailsLoading={richDetailsLoading}
          richDetailsError={richDetailsError}
          onClose={() => setExpandedItem(null)}
          actions={(() => {
            const inList = isMovieInList(expandedItem)
            const userMovie = findUserMovie(expandedItem)
            // in-list: picker reflete a prioridade atual e clicar troca inline
            // not-in-list: picker seleciona qual prioridade usar no add (default MEDIUM)
            const activePriority = inList ? userMovie?.priority : modalPriority
            const handlePickerChange = (value) => {
              if (inList) handleChangePriority(expandedItem, value)
              else        setModalPriority(value)
            }

            return (
              <div className="modal-actions-stack">
                <PriorityPicker value={activePriority} onChange={handlePickerChange} />
                <button
                  onClick={() => inList
                    ? handleRemoveMovie(expandedItem)
                    : handleAddMovie(expandedItem, modalPriority)}
                  disabled={!profile || addingMovie === expandedItem.id}
                  className={`btn-add ${inList ? 'btn-remove' : ''}`}
                >
                  {addingMovie === expandedItem.id
                    ? 'Processando...'
                    : inList
                      ? '🗑️ Remover da lista'
                      : '➕ Adicionar à lista'}
                </button>
              </div>
            )
          })()}
        />
      )}
    </div>
  )
}

export default Search

