import { SlidersHorizontal } from 'lucide-react'

const FilterSheetTrigger = ({ count = 0, onClick, label = 'Filtros', className = '' }) => (
  <button
    type="button"
    className={`ui-filter-sheet-trigger ${className}`.trim()}
    onClick={onClick}
  >
    <SlidersHorizontal size={16} />
    {label}
    {count > 0 && (
      <span className="ui-filter-sheet-trigger-badge">{count}</span>
    )}
  </button>
)

export default FilterSheetTrigger
