import Button from './Button.jsx'

export const TYPE_OPTIONS = [
  { value: 'MOVIE',  label: 'Filme'  },
  { value: 'SERIES', label: 'Série'  },
  { value: 'ANIME',  label: 'Anime'  },
]

export const ALL_TYPES = TYPE_OPTIONS.map(t => t.value)

const TypeFilterPills = ({ value, onChange }) => {
  const toggle = (type) => {
    const next = value.includes(type) ? value.filter(t => t !== type) : [...value, type]
    onChange(next)
  }

  return (
    <>
      {TYPE_OPTIONS.map(({ value: v, label }) => (
        <Button
          key={v}
          variant="filter"
          size="sm"
          pill
          active={value.includes(v)}
          onClick={() => toggle(v)}
        >
          {label}
        </Button>
      ))}
    </>
  )
}

export default TypeFilterPills
