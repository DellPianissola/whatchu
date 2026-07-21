import { List, LayoutGrid } from 'lucide-react'
import { VIEW_MODES } from '../constants/ui.js'
import './ViewModeToggle.css'

const OPTIONS = [
  { value: VIEW_MODES.LIST,    Icon: List,       label: 'Lista' },
  { value: VIEW_MODES.POSTERS, Icon: LayoutGrid, label: 'Pôsteres' },
]

const ViewModeToggle = ({ value, onChange, className = '' }) => (
  <div className={`ui-view-toggle ${className}`.trim()} role="group" aria-label="Modo de visualização">
    {OPTIONS.map(({ value: v, Icon, label }) => (
      <button
        key={v}
        type="button"
        className={`ui-view-toggle-btn ${value === v ? 'active' : ''}`}
        onClick={() => onChange(v)}
        aria-pressed={value === v}
        aria-label={label}
        title={label}
      >
        <Icon size={18} />
      </button>
    ))}
  </div>
)

export default ViewModeToggle
