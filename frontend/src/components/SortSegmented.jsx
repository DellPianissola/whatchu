import { splitSort, toggleSortField, getSortIcon } from '../utils/sort.jsx'
import './SortSegmented.css'

const SortSegmented = ({
  fields,
  value,
  onChange,
  label = 'Ordenar por',
  disabled = false,
  disabledTitle = '',
  className = '',
}) => {
  const { field: activeField, dir } = splitSort(value)

  return (
    <div className={`ui-sort-segmented ${className}`.trim()} role="group" aria-label={label}>
      {fields.map(({ field, label: fieldLabel, Icon }) => {
        const active = activeField === field
        return (
          <button
            key={field}
            type="button"
            className={`ui-sort-seg-btn ${active ? 'active' : ''}`}
            onClick={() => onChange(toggleSortField(value, field))}
            disabled={disabled}
            title={disabled ? disabledTitle : ''}
            aria-pressed={active}
          >
            <Icon size={14} />
            <span>{fieldLabel}</span>
            <span className="ui-sort-seg-arrow" aria-hidden>
              {active ? getSortIcon(dir) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default SortSegmented
