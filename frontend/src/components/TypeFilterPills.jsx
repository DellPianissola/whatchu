import { Film, Tv } from 'lucide-react'
import { TYPE_LABEL } from '../utils/content.js'
import './TypeFilterPills.css'

const TYPE_OPTIONS = [
  { value: 'MOVIE',  label: TYPE_LABEL.MOVIE,  Icon: Film },
  { value: 'SERIES', label: TYPE_LABEL.SERIES, Icon: Tv   },
]

const TypeFilterPills = ({ value, onChange, multi = true, options = TYPE_OPTIONS }) => {
  const isActive = (type) => (multi ? value.includes(type) : value === type)

  const handleClick = (type) => {
    if (!multi) {
      onChange(type)
      return
    }
    onChange(value.includes(type) ? value.filter(t => t !== type) : [...value, type])
  }

  return (
    <>
      {options.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          className={`filter-btn ${isActive(v) ? 'active' : ''}`}
          aria-pressed={isActive(v)}
          onClick={() => handleClick(v)}
        >
          <Icon size={18} /> {label}
        </button>
      ))}
    </>
  )
}

export default TypeFilterPills
