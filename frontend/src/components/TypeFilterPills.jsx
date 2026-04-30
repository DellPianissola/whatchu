import './TypeFilterPills.css'

export const TYPE_OPTIONS = [
  { value: 'MOVIE',  label: 'Filme'  },
  { value: 'SERIES', label: 'Série'  },
  { value: 'ANIME',  label: 'Anime'  },
]

export const ALL_TYPES = TYPE_OPTIONS.map(t => t.value)

/**
 * Pills de filtro por tipo (Filme / Série / Anime) com multi-seleção.
 *
 * - Default: passar `ALL_TYPES` no `value` inicial.
 * - Cada pill é um toggle independente.
 * - Se o usuário desmarcar todos, volta automaticamente pra todos selecionados
 *   (sempre há pelo menos um filtro válido).
 *
 * Renderiza um fragmento — quem chama escolhe o container (flex row, etc.).
 *
 * Props:
 *   value    — array de tipos selecionados
 *   onChange — recebe o novo array
 */
const TypeFilterPills = ({ value, onChange }) => {
  const toggle = (type) => {
    const next = value.includes(type) ? value.filter(t => t !== type) : [...value, type]
    onChange(next.length === 0 ? ALL_TYPES : next)
  }

  return (
    <>
      {TYPE_OPTIONS.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          className={`filter-pill ${value.includes(v) ? 'active' : ''}`}
          onClick={() => toggle(v)}
        >
          {label}
        </button>
      ))}
    </>
  )
}

export default TypeFilterPills
