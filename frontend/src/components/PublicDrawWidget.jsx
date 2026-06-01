import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { useFilterSheet } from '../hooks/useFilterSheet.js'
import { useDrawFilters } from '../hooks/useDrawFilters.js'
import { performLuckyDraw } from '../utils/draw.js'
import TypeFilterPills from './TypeFilterPills.jsx'
import DrawFilterDropdowns from './DrawFilterDropdowns.jsx'
import FilterSheet from './FilterSheet.jsx'
import FilterSheetTrigger from './FilterSheetTrigger.jsx'
import DrawResultPanel from './DrawResultPanel.jsx'
import CardModal from './CardModal.jsx'
import { ROUTES } from '../constants/routes.js'
import './PublicDrawWidget.css'

const PublicDrawWidget = () => {
  const { toast } = useNotify()
  const {
    filterTypes, selectTypes,
    filterGenres, setFilterGenres,
    filterProviders, setFilterProviders,
    availableGenres, streamingOptions,
  } = useDrawFilters()
  const [result, setResult] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

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

  const handleLucky = () => performLuckyDraw(
    { types: filterTypes, genres: filterGenres, providers: filterProviders },
    { toast, setDrawing: setIsDrawing, setResult }
  )

  const filterDropdowns = (variant, genres, onGenresChange, providers, onProvidersChange) => (
    <DrawFilterDropdowns
      variant={variant}
      availableGenres={availableGenres}
      genres={genres}
      onGenresChange={onGenresChange}
      streamingOptions={streamingOptions}
      providers={providers}
      onProvidersChange={onProvidersChange}
    />
  )

  return (
    <div className="public-draw-widget">
      <div className="public-draw-filters">
        <div className="public-draw-types">
          <TypeFilterPills
            value={filterTypes}
            onChange={selectTypes}
          />
        </div>
        <div className="public-draw-dropdowns">
          {filterDropdowns('pills', filterGenres, setFilterGenres, filterProviders, setFilterProviders)}
        </div>
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
        {filterDropdowns(
          'sheet',
          filterSheet.pending.genres,
          (val) => filterSheet.setField('genres', val),
          filterSheet.pending.providers,
          (val) => filterSheet.setField('providers', val),
        )}
      </FilterSheet>
    </div>
  )
}

export default PublicDrawWidget
