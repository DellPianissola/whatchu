import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Dices, Sparkles, Users } from 'lucide-react'
import { drawMovie } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { useMovieActions } from '../hooks/useMovieActions.js'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import { useDrawFilters } from '../hooks/useDrawFilters.js'
import { performLuckyDraw } from '../utils/draw.js'
import Wordmark from '../components/Wordmark.jsx'
import StatPills from '../components/StatPills.jsx'
import CardModal from '../components/CardModal.jsx'
import AddToListButton from '../components/AddToListButton.jsx'
import TypeFilterPills from '../components/TypeFilterPills.jsx'
import Dropdown from '../components/Dropdown.jsx'
import DrawFilterDropdowns from '../components/DrawFilterDropdowns.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import FilterSheetTrigger from '../components/FilterSheetTrigger.jsx'
import Button from '../components/Button.jsx'
import DrawResultPanel from '../components/DrawResultPanel.jsx'
import { PRIORITY_OPTIONS } from '../utils/content.js'
import { ERROR_CODES } from '../constants/errorCodes.js'
import { ROUTES } from '../constants/routes.js'
import { DRAW_DELAY_MS } from '../constants/ui.js'
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
  const {
    filterTypes, selectTypes,
    filterGenres, setFilterGenres,
    filterProviders, setFilterProviders,
    availableGenres, streamingOptions,
  } = useDrawFilters()
  const [filterPriorities, setFilterPriorities] = useState([])
  const [ignoreWatched, setIgnoreWatched] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const stats = useMemo(() => ({
    movies: userMovies.filter((m) => m.type === 'MOVIE').length,
    series: userMovies.filter((m) => m.type === 'SERIES').length,
  }), [userMovies])

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

  const handleLucky = () => performLuckyDraw(
    { types: filterTypes, genres: filterGenres, providers: filterProviders },
    { toast, setDrawing: setIsDrawing, setResult: setSelectedMovie }
  )

  const handleGroup = () => {
    toast.info('Em breve — você vai poder sortear com os amigos!')
  }

  const onAddFromModal = async (priority) => {
    const created = await addMovie(selectedMovie, priority)
    if (created) setSelectedMovie(created)
  }

  const activeFilterCount =
    filterPriorities.length + filterGenres.length + filterProviders.length + (ignoreWatched ? 1 : 0)

  const filterSheet = useFilterSheet({
    defaults: { priorities: [], genres: [], providers: [], ignoreWatched: false },
    onCommit: ({ priorities, genres, providers, ignoreWatched: ignored }) => {
      setFilterPriorities(priorities)
      setFilterGenres(genres)
      setFilterProviders(providers)
      setIgnoreWatched(ignored)
    },
  })

  const togglePendingPriority = (value) =>
    filterSheet.setField(
      'priorities',
      filterSheet.pending.priorities.includes(value)
        ? filterSheet.pending.priorities.filter(v => v !== value)
        : [...filterSheet.pending.priorities, value]
    )

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
        checked={filterSheet.pending.ignoreWatched}
        onChange={(e) => filterSheet.setField('ignoreWatched', e.target.checked)}
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
              active={filterSheet.pending.priorities.includes(opt.value)}
              onClick={() => togglePendingPriority(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </section>

      <DrawFilterDropdowns
        variant="sheet"
        availableGenres={availableGenres}
        genres={filterSheet.pending.genres}
        onGenresChange={(val) => filterSheet.setField('genres', val)}
        streamingOptions={streamingOptions}
        providers={filterSheet.pending.providers}
        onProvidersChange={(val) => filterSheet.setField('providers', val)}
      />

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
      <DrawFilterDropdowns
        variant="pills"
        availableGenres={availableGenres}
        genres={filterGenres}
        onGenresChange={setFilterGenres}
        streamingOptions={streamingOptions}
        providers={filterProviders}
        onProvidersChange={setFilterProviders}
      />
    </>
  )

  const greeting = profile?.name ? `Olá, ${profile.name.split(' ')[0]}!` : 'Bem-vindo!'
  const totalItems = stats.movies + stats.series
  const listIsEmpty = !userMoviesLoading && totalItems === 0
  const noTypeSelected = filterTypes.length === 0
  const drawDisabled = isDrawing || noTypeSelected

  return (
    <div className="home">
      <div className={`home-content ${isLoaded ? 'loaded' : ''}`}>
        <header className="home-header">
          <div className="logo">
            <Wordmark variant="hero" logoSize={72} subtitle="O que vamos assistir hoje?" />
          </div>
        </header>

        <div className="main-card">

          <div className="card-left">
            <div className="greeting-row">
              <h2 className="greeting">{greeting}</h2>
              {!userMoviesLoading && (
                <StatPills movies={stats.movies} series={stats.series} />
              )}
            </div>

            <div className="draw-filters">
              <div className="draw-filter-row">
                <TypeFilterPills
                  value={filterTypes}
                  onChange={selectTypes}
                />
                <div className="draw-filters-inline">{desktopDropdowns}</div>
                <FilterSheetTrigger
                  count={activeFilterCount}
                  onClick={() => filterSheet.openWith({
                    priorities: filterPriorities,
                    genres: filterGenres,
                    providers: filterProviders,
                    ignoreWatched,
                  })}
                />
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
            <DrawResultPanel
              item={selectedMovie}
              isDrawing={isDrawing}
              showProviders
              onOpen={() => setModalOpen(true)}
              onClose={() => { setSelectedMovie(null); setModalOpen(false) }}
            />
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
        open={filterSheet.open}
        onClose={filterSheet.close}
        onClear={filterSheet.clear}
      >
        {sheetFilters}
      </FilterSheet>
    </div>
  )
}

export default Home
