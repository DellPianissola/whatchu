import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Dices, Sparkles, Users } from 'lucide-react'
import { drawMovie, getFriends } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useUserMovies } from '../contexts/UserMoviesContext.jsx'
import { useMovieActions } from '../hooks/useMovieActions.js'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import { useDrawFilters } from '../hooks/useDrawFilters.js'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'
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
import FriendPicker from '../components/FriendPicker.jsx'
import Avatar from '../components/Avatar.jsx'
import Switch from '../components/Switch.jsx'
import { PRIORITY_OPTIONS } from '../utils/content.js'
import { ERROR_CODES } from '../constants/errorCodes.js'
import { ROUTES } from '../constants/routes.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { DRAW_DELAY_MS, DRAW_FRIENDS_MAX_AVATARS, RECENT_FRIENDS_LIMIT } from '../constants/ui.js'
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
  const [ignoreWatched, setIgnoreWatched] = useState(true)
  const [onlyCommon, setOnlyCommon] = useState(false)
  const [friendPickerOpen, setFriendPickerOpen] = useState(false)
  const [drawFriends, setDrawFriends] = useLocalStorageState(
    `${STORAGE_KEYS.DRAW_FRIENDS}:${profile?.id ?? 'anon'}`,
    []
  )
  const [recentFriendIds, setRecentFriendIds] = useLocalStorageState(
    `${STORAGE_KEYS.DRAW_FRIENDS_RECENT}:${profile?.id ?? 'anon'}`,
    []
  )
  const [drawSources, setDrawSources] = useState(null)

  const applyDrawFriends = (list) => {
    setDrawFriends(list)
    if (list.length > 0) {
      setRecentFriendIds((prev) =>
        [...new Set([...list.map((f) => f.id), ...prev])].slice(0, RECENT_FRIENDS_LIMIT))
    }
  }

  // Snapshot persistido pode estar stale (nome/avatar) ou conter amizade já desfeita.
  const friendsSyncedRef = useRef(false)
  useEffect(() => {
    if (friendsSyncedRef.current || drawFriends.length === 0) return
    friendsSyncedRef.current = true
    let cancelled = false
    getFriends()
      .then(({ friends }) => {
        if (cancelled) return
        const byId = new Map(friends.map((f) => [f.profile.id, f.profile]))
        setDrawFriends((prev) => prev.map((f) => byId.get(f.id)).filter(Boolean))
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawFriends])

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const stats = useMemo(() => ({
    movies: userMovies.filter((m) => m.type === 'MOVIE').length,
    series: userMovies.filter((m) => m.type === 'SERIES').length,
  }), [userMovies])

  const handleDraw = async () => {
    const withFriends = drawFriends.length > 0
    setIsDrawing(true)
    setSelectedMovie(null)
    setDrawSources(null)
    try {
      await new Promise(resolve => setTimeout(resolve, DRAW_DELAY_MS))
      const { movie, sources } = await drawMovie({
        types: filterTypes,
        priorities: filterPriorities,
        genres: filterGenres,
        providers: filterProviders,
        ignoreWatched,
        onlyCommon: withFriends && onlyCommon,
        friendIds: drawFriends.map((f) => f.id),
      })
      setSelectedMovie(movie)
      if (withFriends) setDrawSources(sources)
    } catch (error) {
      const code = error.response?.data?.code
      if (withFriends && error.response?.status === 403) {
        // Amizade desfeita desde a última seleção — seleção persistida ficou órfã.
        setDrawFriends([])
        toast.error('Algum amigo selecionado não está mais disponível. Monte o grupo de novo.')
      } else if (code === ERROR_CODES.EMPTY_LIST) {
        toast.info(withFriends
          ? 'Nenhuma das listas tem itens — adicionem filmes ou séries pra começar'
          : 'Sua lista está vazia — adicione filmes ou séries pra começar')
      } else if (code === ERROR_CODES.NO_MATCH) {
        toast.info(withFriends
          ? 'Nenhum item das listas corresponde aos filtros selecionados'
          : 'Nenhum item da sua lista corresponde aos filtros selecionados')
      } else {
        toast.error('Erro ao sortear. Tente novamente.')
      }
    } finally {
      setIsDrawing(false)
    }
  }

  const handleLucky = () => {
    setDrawSources(null)
    performLuckyDraw(
      { types: filterTypes, genres: filterGenres, providers: filterProviders },
      { toast, setDrawing: setIsDrawing, setResult: setSelectedMovie }
    )
  }

  const onAddFromModal = async (priority) => {
    const created = await addMovie(selectedMovie, priority)
    if (created) setSelectedMovie(created)
  }

  const activeFilterCount =
    filterPriorities.length + filterGenres.length + filterProviders.length +
    (ignoreWatched ? 1 : 0) + (drawFriends.length > 0 && onlyCommon ? 1 : 0)

  const filterSheet = useFilterSheet({
    defaults: { priorities: [], genres: [], providers: [], ignoreWatched: true, onlyCommon: false },
    onCommit: ({ priorities, genres, providers, ignoreWatched: ignored, onlyCommon: common }) => {
      setFilterPriorities(priorities)
      setFilterGenres(genres)
      setFilterProviders(providers)
      setIgnoreWatched(ignored)
      setOnlyCommon(common)
    },
  })

  const togglePendingPriority = (value) =>
    filterSheet.setField(
      'priorities',
      filterSheet.pending.priorities.includes(value)
        ? filterSheet.pending.priorities.filter(v => v !== value)
        : [...filterSheet.pending.priorities, value]
    )

  const drawToggles = (
    <>
      <Switch checked={ignoreWatched} onChange={setIgnoreWatched} label="Ignorar já assistidos" />
      {drawFriends.length > 0 && (
        <Switch checked={onlyCommon} onChange={setOnlyCommon} label="Só itens em comum" />
      )}
    </>
  )

  const pendingDrawToggles = (
    <>
      <Switch
        checked={filterSheet.pending.ignoreWatched}
        onChange={(val) => filterSheet.setField('ignoreWatched', val)}
        label="Ignorar já assistidos"
      />
      {drawFriends.length > 0 && (
        <Switch
          checked={filterSheet.pending.onlyCommon}
          onChange={(val) => filterSheet.setField('onlyCommon', val)}
          label="Só itens em comum"
        />
      )}
    </>
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
        {pendingDrawToggles}
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
  const listIsEmpty = !userMoviesLoading && totalItems === 0 && drawFriends.length === 0
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
                    onlyCommon,
                  })}
                />
              </div>
              <div className="draw-filters-toggle-row">
                {drawToggles}
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
                <button className="btn-group" onClick={() => setFriendPickerOpen(true)}>
                  <Users size={18} /> Sortear com amigos
                </button>
                {drawFriends.length > 0 && (
                  <div className="draw-friends-chips">
                    {drawFriends.slice(0, DRAW_FRIENDS_MAX_AVATARS).map((f) => (
                      <button
                        key={f.id}
                        className="draw-friend-chip"
                        onClick={() => setDrawFriends((prev) => prev.filter((p) => p.id !== f.id))}
                        title={`Remover ${f.name} do sorteio`}
                        aria-label={`Remover ${f.name} do sorteio`}
                      >
                        <Avatar src={f.avatarUrl} name={f.name} size={26} />
                      </button>
                    ))}
                    {drawFriends.length > DRAW_FRIENDS_MAX_AVATARS && (
                      <button
                        className="draw-friend-chip draw-friend-chip--more"
                        onClick={() => setFriendPickerOpen(true)}
                        title="Ver todos os amigos do sorteio"
                        aria-label="Ver todos os amigos do sorteio"
                      >
                        +{drawFriends.length - DRAW_FRIENDS_MAX_AVATARS}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card-right">
            <DrawResultPanel
              item={selectedMovie}
              isDrawing={isDrawing}
              showProviders
              sources={drawSources}
              onOpen={() => setModalOpen(true)}
              onClose={() => { setSelectedMovie(null); setDrawSources(null); setModalOpen(false) }}
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

      <FriendPicker
        open={friendPickerOpen}
        onClose={() => setFriendPickerOpen(false)}
        selected={drawFriends}
        onConfirm={applyDrawFriends}
        recentIds={recentFriendIds}
      />

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
