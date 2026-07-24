import { Minus } from 'lucide-react'
import Segmented from './Segmented.jsx'
import { splitSort, toggleSortField, getSortIcon } from '../utils/sort.jsx'

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

  const options = fields.map(({ field, label: fieldLabel, Icon, directionless }) => ({
    value: field, label: fieldLabel, Icon, directionless,
  }))

  return (
    <Segmented
      className={className}
      label={label}
      disabled={disabled}
      disabledTitle={disabledTitle}
      options={options}
      isActive={(option) => option.value === activeField}
      onChange={(field, option) => onChange(toggleSortField(value, field, option.directionless))}
      renderExtra={(option, active) => option.directionless ? null : (
        <span className={`ui-segmented-extra ${active ? '' : 'is-idle'}`.trim()} aria-hidden>
          {active ? getSortIcon(dir) : <Minus size={14} />}
        </span>
      )}
    />
  )
}

export default SortSegmented
