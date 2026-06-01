import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { luckyDraw, getExternalGenres } from '../services/api.js'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useStreamingProviders } from '../hooks/useStreamingProviders.js'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import TypeFilterPills, { ALL_TYPES } from './TypeFilterPills.jsx'
import Dropdown from './Dropdown.jsx'
import FilterSheet from './FilterSheet.jsx'
import FilterSheetTrigger from './FilterSheetTrigger.jsx'
import DrawResultPanel from './DrawResultPanel.jsx'
import CardModal from './CardModal.jsx'
import { ROUTES } from '../constants/routes.js'
import { DRAW_DELAY_MS } from '../constants/ui.js'
import './PublicDrawWidget.css'

const PublicDrawWidget = () => {
  const { toast } = useNotify()
  const { options: streamingOptions } = useStreamingProviders()
  const [filterTypes, setFilterTypes] = useState(ALL_TYPES)
  const [filterGenres, setFilterGenres] = useState([])
  const [filterProviders, setFilterProviders] = useState([])
  const [genresByType, setGenresByType] = useState({ MOVIE: [], SERIES: [] })
  const [result, setResult] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getExternalGenres('movie'), getExternalGenres('series')])
      .then(([movie, series]) => { if (!cancelled) setGenresByType({ MOVIE: movie, SERIES: series }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const availableGenres = useMemo(() => {
    const set = new Set()
    filterTypes.forEach(t => (genresByType[t] || []).forEach(g => set.add(g)))
    return [...set].sort()
  }, [filterTypes, genresByType])

  const noTypeSelected = filterTypes.length === 0
  const drawDisabled = isDrawing || noTypeSelected
  const activeFilterCount = filterGenres.length + filterProviders.length

  const filterSheet = useFilterSheet({
    defaults: { genres: [], providers: [] },
    onCommit: ({ genres, providers }) => {
      setFilterGenres(genres)
      setFilterProviders(providers)
    },
  })

  const handleLucky = async () => {
    setIsDrawing(true)
    setResult(null)
    try {
      await new Promise(resolve => setTimeout(resolve, DRAW_DELAY_MS))
      const movie = await luckyDraw({ types: filterTypes, genres: filterGenres, providers: filterProviders })
      if (movie) {
        setResult(movie)
      } else {
        toast.info('Não rolou achar nada com esses filtros. Tente outros gêneros ou tipos.')
      }
    } catch (error) {
      toast.error('Erro ao sortear. Tente novamente.')
    } finally {
      setIsDrawing(false)
    }
  }

  const dropdowns = (
    <>
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

  return (
    <div className="public-draw-widget">
      <div className="public-draw-filters">
        <div className="public-draw-types">
          <TypeFilterPills
            value={filterTypes}
            onChange={(next) => { setFilterTypes(next); setFilterGenres([]) }}
          />
        </div>
        <div className="public-draw-dropdowns">{dropdowns}</div>
        <FilterSheetTrigger
          count={activeFilterCount}
          className="public-draw-sheet-trigger"
          onClick={() => filterSheet.openWith({ genres: filterGenres, providers: filterProviders })}
        />
      </div>

      <button
        type="button"
        className="public-draw-btn"
        onClick={handleLucky}
        disabled={drawDisabled}
        title={noTypeSelected ? 'Selecione ao menos um tipo (Filme ou Série)' : undefined}
      >
        <Sparkles size={24} />
        {isDrawing ? 'Sorteando...' : 'Sortear'}
      </button>

      <div className="public-draw-result">
        <DrawResultPanel
          item={result}
          isDrawing={isDrawing}
          showProviders
          onOpen={result ? () => setModalOpen(true) : undefined}
          onClose={result ? () => { setResult(null); setModalOpen(false) } : undefined}
        />
      </div>

      {modalOpen && result && (
        <CardModal
          item={result}
          onClose={() => setModalOpen(false)}
          actions={
            <Link to={ROUTES.REGISTER} className="public-draw-modal-cta">
              Criar conta pra salvar na lista
            </Link>
          }
        />
      )}

      <FilterSheet
        open={filterSheet.open}
        onClose={filterSheet.close}
        onClear={filterSheet.clear}
      >
        {availableGenres.length > 0 && (
          <section className="filter-section">
            <span className="filter-section-label">Gênero</span>
            <Dropdown
              multi
              trigger="button"
              align="left"
              label="Selecionar"
              options={availableGenres}
              value={filterSheet.pending.genres}
              onChange={(val) => filterSheet.setField('genres', val)}
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
              value={filterSheet.pending.providers}
              onChange={(val) => filterSheet.setField('providers', val)}
            />
          </section>
        )}
      </FilterSheet>
    </div>
  )
}

export default PublicDrawWidget
