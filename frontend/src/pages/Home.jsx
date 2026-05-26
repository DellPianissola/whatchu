import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Dices, Sparkles, Users, Calendar, Star, Clock, X } from 'lucide-react'
import { drawMovie, luckyDraw, getExternalGenres, getStreamingProviders } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { useMovieActions } from '../hooks/useMovieActions.js'
import PosterPlaceholder from '../components/PosterPlaceholder.jsx'
import Wordmark from '../components/Wordmark.jsx'
import IconButton from '../components/IconButton.jsx'
import CardModal from '../components/CardModal.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import TypeFilterPills, { ALL_TYPES } from '../components/TypeFilterPills.jsx'
import Dropdown from '../components/Dropdown.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import FilterSheetTrigger from '../components/FilterSheetTrigger.jsx'
import Button from '../components/Button.jsx'
import GeoPlaceholder from '../components/GeoPlaceholder.jsx'
import { TYPE_LABEL, PRIORITY_OPTIONS, formatDuration } from '../utils/content.js'
import { ERROR_CODES } from '../constants/errorCodes.js'
import { ROUTES } from '../constants/routes.js'
import { DRAW_DELAY_MS, GLOW_DOT_COUNT } from '../constants/ui.js'
import './Home.css'

const Home = () => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const { userMovies, isLoading: userMoviesLoading } = useUserMovies()
  const { processingId, addMovie, removeMovie, setPriority, findByItem } = useMovieActions()
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterTypes, setFilterTypes] = useState(ALL_TYPES)
  const [filterPriorities, setFilterPriorities] = useState([])
  const [filterGenres, setFilterGenres] = useState([])
  const [filterProviders, setFilterProviders] = useState([])
  const [genresByType, setGenresByType] = useState({ MOVIE: [], SERIES: [] })
  const [streamingProviders, setStreamingProviders] = useState([])
  const [ignoreWatched, setIgnoreWatched] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [pendingPriorities, setPendingPriorities] = useState([])
  const [pendingGenres, setPendingGenres] = useState([])
  const [pendingProviders, setPendingProviders] = useState([])
  const [pendingIgnoreWatched, setPendingIgnoreWatched] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    loadGenres()
    loadStreamingProviders()
  }, [])

  const loadGenres = async () => {
    try {
      const [movie, series] = await Promise.all([
        getExternalGenres('movie'),
        getExternalGenres('series'),
      ])
      setGenresByType({ MOVIE: movie, SERIES: series })
    } catch (error) {
      console.error('Erro ao carregar gêneros:', error)
    }
  }

  const loadStreamingProviders = async () => {
    try {
      setStreamingProviders(await getStreamingProviders())
    } catch (error) {
      console.error('Erro ao carregar streamings:', error)
    }
  }

  const stats = useMemo(() => ({
    movies: userMovies.filter((m) => m.type === 'MOVIE').length,
    series: userMovies.filter((m) => m.type === 'SERIES').length,
  }), [userMovies])

  const availableGenres = useMemo(() => {
    const set = new Set()
    filterTypes.forEach(t => (genresByType[t] || []).forEach(g => set.add(g)))
    return [...set].sort()
  }, [filterTypes, genresByType])

  const streamingOptions = useMemo(
    () => streamingProviders.map(p => ({ value: p.key, label: p.name })),
    [streamingProviders]
  )

  const handleDraw = async () => {
    setIsDrawing(true)
    setSelectedMovie(null)
    try {
      await new Promise(resolve => setTimeout(resolve, DRAW_DELAY_MS))
      const movie = await drawMovie({
        types: filterTypes,
        priorities: filterPriorities,
        genres: filterGenres,
        providers: filterProviders,
        ignoreWatched,
      })
      setSelectedMovie(movie)
    } catch (error) {
      const code = error.response?.data?.code
      if (code === ERROR_CODES.EMPTY_LIST) {
        toast.info('Sua lista está vazia — adicione filmes ou séries pra começar')
      } else if (code === ERROR_CODES.NO_MATCH) {
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
      await new Promise(resolve => setTimeout(resolve, DRAW_DELAY_MS))
      const movie = await luckyDraw({
        types: filterTypes,
        genres: filterGenres,
        providers: filterProviders,
      })
      if (movie) {
        setSelectedMovie(movie)
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

  const onAddFromModal = async (priority) => {
    const created = await addMovie(selectedMovie, priority)
    if (created) setSelectedMovie(created)
  }

  const activeFilterCount =
    filterPriorities.length + filterGenres.length + filterProviders.length + (ignoreWatched ? 1 : 0)

  const openFilterSheet = () => {
    setPendingPriorities(filterPriorities)
    setPendingGenres(filterGenres)
    setPendingProviders(filterProviders)
    setPendingIgnoreWatched(ignoreWatched)
    setFilterSheetOpen(true)
  }

  const commitPendingAndClose = () => {
    setFilterPriorities(pendingPriorities)
    setFilterGenres(pendingGenres)
    setFilterProviders(pendingProviders)
    setIgnoreWatched(pendingIgnoreWatched)
    setFilterSheetOpen(false)
  }

  const clearAndApply = () => {
    setPendingPriorities([])
    setPendingGenres([])
    setPendingProviders([])
    setPendingIgnoreWatched(false)
    setFilterPriorities([])
    setFilterGenres([])
    setFilterProviders([])
    setIgnoreWatched(false)
    setFilterSheetOpen(false)
  }

  const togglePendingPriority = (value) =>
    setPendingPriorities(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

  const togglePriority = (value) =>
    setFilterPriorities(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

  const ignoreWatchedToggle = (
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
  )

  const pendingIgnoreWatchedToggle = (
    <label className="draw-toggle-label">
      <input
        type="checkbox"
        checked={pendingIgnoreWatched}
        onChange={(e) => setPendingIgnoreWatched(e.target.checked)}
        className="draw-toggle-input"
      />
      <span className="draw-toggle-track" />
      <span className="draw-toggle-text">Ignorar já assistidos</span>
    </label>
  )

  const sheetFilters = (
    <>
      <section className="filter-section">
        <span className="filter-section-label">Prioridade</span>
        <div className="filter-chip-group">
          {PRIORITY_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant="filter"
              size="sm"
              pill
              active={pendingPriorities.includes(opt.value)}
              onClick={() => togglePendingPriority(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </section>

      {availableGenres.length > 0 && (
        <section className="filter-section">
          <span className="filter-section-label">Gênero</span>
          <Dropdown
            multi
            trigger="button"
            align="left"
            label="Selecionar"
            options={availableGenres}
            value={pendingGenres}
            onChange={setPendingGenres}
          />
        </section>
      )}

      {streamingOptions.length > 0 && (
        <section className="filter-section">
          <span className="filter-section-label">Streaming</span>
          <Dropdown
            multi
            trigger="button"
            align="left"
            label="Selecionar"
            options={streamingOptions}
            value={pendingProviders}
            onChange={setPendingProviders}
          />
        </section>
      )}

      <section className="filter-section">
        {pendingIgnoreWatchedToggle}
      </section>
    </>
  )

  const desktopDropdowns = (
    <>
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
      {streamingOptions.length > 0 && (
        <Dropdown
          multi
          trigger="pill"
          align="left"
          label="Streaming"
          options={streamingOptions}
          value={filterProviders}
          onChange={setFilterProviders}
        />
      )}
    </>
  )

  const greeting = profile?.name ? `Olá, ${profile.name.split(' ')[0]}!` : 'Bem-vindo!'
  const totalItems = stats.movies + stats.series
  const listIsEmpty = !userMoviesLoading && totalItems === 0
  const noTypeSelected = filterTypes.length === 0
  const drawDisabled = isDrawing || noTypeSelected

  return (
    <div className="home">
      <div className="cinema-bg">
        {[...Array(GLOW_DOT_COUNT)].map((_, i) => (
          <div key={i} className={`glow-dot glow-dot-${i + 1}`} />
        ))}
      </div>

      <div className={`home-content ${isLoaded ? 'loaded' : ''}`}>
        <header className="home-header">
          <div className="logo">
            <Wordmark variant="hero" logoSize={72} subtitle="O que vamos assistir hoje?" />
          </div>
        </header>

        <div className="main-card">

          <div className="card-left">
            <div className="card-header">
              <h2>{greeting}</h2>
            </div>

            <div className="stats-preview">
              <div className="stat-item">
                <div className="stat-value">{userMoviesLoading ? '—' : stats.movies}</div>
                <div className="stat-label">Filmes</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-value">{userMoviesLoading ? '—' : stats.series}</div>
                <div className="stat-label">Séries</div>
              </div>
            </div>

            <div className="draw-filters">
              <div className="draw-filter-row">
                <TypeFilterPills value={filterTypes} onChange={setFilterTypes} />
                <div className="draw-filters-inline">{desktopDropdowns}</div>
                <FilterSheetTrigger count={activeFilterCount} onClick={openFilterSheet} />
              </div>
              <div className="draw-filters-toggle-row">
                {ignoreWatchedToggle}
              </div>
            </div>

            <div className="card-actions">
              {listIsEmpty ? (
                <div className="empty-list-state">
                  <p className="empty-list-text">
                    Sua lista está vazia. Pesquise filmes ou séries para começar.
                  </p>
                  <Link to={ROUTES.SEARCH} className="btn btn-primary btn-draw">
                    <span className="btn-icon"><SearchIcon size={20} /></span>
                    <span className="btn-text">Pesquisar conteúdo</span>
                  </Link>
                </div>
              ) : (
                <div className="action-buttons-main">
                  <button
                    className="btn btn-primary btn-draw"
                    onClick={handleDraw}
                    disabled={drawDisabled}
                    title={noTypeSelected ? 'Selecione ao menos um tipo (Filme ou Série)' : undefined}
                  >
                    <span className="btn-icon"><Dices size={20} /></span>
                    <span className="btn-text">{isDrawing ? 'Sorteando...' : 'Sortear'}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-lucky"
                    onClick={handleLucky}
                    disabled={drawDisabled}
                    title={noTypeSelected ? 'Selecione ao menos um tipo (Filme ou Série)' : undefined}
                  >
                    <span className="btn-icon"><Sparkles size={20} /></span>
                    <span className="btn-text">{isDrawing ? 'Sorteando...' : 'Estou com sorte'}</span>
                  </button>
                </div>
              )}

              <div className="group-row">
                <button className="btn-group" onClick={handleGroup}>
                  <Users size={18} /> Formar grupo
                  <span className="btn-soon btn-soon--inline">em breve</span>
                </button>
              </div>
            </div>
          </div>

          <div className="card-right">
            {selectedMovie ? (
              <button
                type="button"
                className="draw-result-panel"
                onClick={() => setModalOpen(true)}
              >
                {selectedMovie.poster ? (
                  <img
                    src={selectedMovie.poster}
                    alt=""
                    className="draw-result-bg"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <PosterPlaceholder
                    title={selectedMovie.title}
                    type={selectedMovie.type}
                    className="draw-result-bg"
                  />
                )}
                <div className="draw-result-top">
                  <span className="draw-result-label"><Sparkles size={16} /> Sorteado!</span>
                  <IconButton
                    icon={<X size={20} />}
                    label="Fechar sorteio"
                    onClick={(e) => { e.stopPropagation(); setSelectedMovie(null); setModalOpen(false) }}
                    className="btn-close-draw"
                  />
                </div>
                <div className="draw-result-content">
                  <div className="draw-result-meta">
                    <span className="draw-type">
                      {TYPE_LABEL[selectedMovie.type] ?? selectedMovie.type}
                    </span>
                    {selectedMovie.year && <span className="draw-meta-item"><Calendar size={14} /> {selectedMovie.year}</span>}
                    {selectedMovie.rating && <span className="draw-meta-item"><Star size={14} /> {selectedMovie.rating}</span>}
                    {selectedMovie.type === 'MOVIE' && selectedMovie.duration && <span className="draw-meta-item"><Clock size={14} /> {formatDuration(selectedMovie.duration)}</span>}
                  </div>
                  <h4 className="draw-result-title">{selectedMovie.title}</h4>
                  {selectedMovie.genres?.length > 0 && (
                    <p className="draw-result-genres">{selectedMovie.genres.join(', ')}</p>
                  )}
                  {selectedMovie.description && (
                    <p className="draw-result-description">{selectedMovie.description}</p>
                  )}
                </div>
              </button>
            ) : (
              <GeoPlaceholder
                className="draw-placeholder"
                animated={isDrawing}
                hint={isDrawing ? 'Sorteando...' : 'O sorteado aparece aqui'}
              />
            )}
          </div>

        </div>
      </div>

      {modalOpen && selectedMovie && (
        <CardModal
          item={selectedMovie}
          onClose={() => setModalOpen(false)}
          actions={
            <AddToListButton
              inList={Boolean(findByItem(selectedMovie))}
              currentPriority={findByItem(selectedMovie)?.priority}
              processing={processingId === selectedMovie.id}
              disabled={!profile}
              compactPriority={false}
              onAdd={onAddFromModal}
              onChangePriority={(p) => setPriority(selectedMovie, p)}
              onRemove={() => removeMovie(selectedMovie)}
            />
          }
        />
      )}

      <FilterSheet
        open={filterSheetOpen}
        onClose={commitPendingAndClose}
        onClear={clearAndApply}
      >
        {sheetFilters}
      </FilterSheet>
    </div>
  )
}

export default Home
