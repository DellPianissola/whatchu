import { Film, Tv } from 'lucide-react'
import './TypeFilterPills.css'

export const TYPE_OPTIONS = [
  { value: 'MOVIE',  label: 'Filme', Icon: Film },
  { value: 'SERIES', label: 'Série', Icon: Tv   },
]

export const ALL_TYPES = TYPE_OPTIONS.map(t => t.value)

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
