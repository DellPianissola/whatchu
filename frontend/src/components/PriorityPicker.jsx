import { PRIORITY_LABEL, PRIORITY_VALUES } from '../utils/content.js'
import './PriorityPicker.css'

const PriorityPicker = ({ value, onChange, label = 'Prioridade' }) => (
  <div className="priority-picker" role="radiogroup" aria-label={label}>
    {label && <span className="priority-picker-label">{label}</span>}
    <div className="priority-pills">
      {PRIORITY_VALUES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
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
