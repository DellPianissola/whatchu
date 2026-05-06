import { PRIORITY_LABEL } from '../utils/content.js'
import './PriorityPicker.css'

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const PriorityPicker = ({ value, onChange, label = 'Prioridade' }) => (
  <div className="priority-picker">
    {label && <span className="priority-picker-label">{label}</span>}
    <div className="priority-pills">
      {PRIORITY_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={`priority-pill priority-pill--${option.toLowerCase()} ${value === option ? 'priority-pill--active' : ''}`}
          onClick={() => onChange?.(option)}
        >
          {PRIORITY_LABEL[option]}
        </button>
      ))}
    </div>
  </div>
)

export default PriorityPicker
