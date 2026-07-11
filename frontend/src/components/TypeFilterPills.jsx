import { Film, Tv } from 'lucide-react'
import { TYPE_LABEL } from '../utils/content.js'
import './TypeFilterPills.css'

const TYPE_OPTIONS = [
  { value: 'MOVIE',  label: TYPE_LABEL.MOVIE,  Icon: Film },
  { value: 'SERIES', label: TYPE_LABEL.SERIES, Icon: Tv   },
]

const TypeFilterPills = ({ value, onChange }) => {
  const toggle = (type) => {
    const next = value.includes(type) ? value.filter(t => t !== type) : [...value, type]
    onChange(next)
  }

  return (
    <>
      {TYPE_OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          className={`filter-btn ${value.includes(v) ? 'active' : ''}`}
          onClick={() => toggle(v)}
        >
          <Icon size={18} /> {label}
        </button>
      ))}
    </>
  )
}

export default TypeFilterPills
