import './Segmented.css'

/**
 * Props não óbvias:
 *   isActive    — override do teste de "ativo"; necessário quando o valor da URL
 *                 não é comparável direto com option.value (sort tem direção junto,
 *                 status é multi-select)
 *   renderExtra — nó extra dentro do botão, recebe (option, active)
 *   selection   — 'single' usa semântica de radio; 'multiple' usa toggle
 */
const Segmented = ({
  options,
  value,
  onChange,
  label,
  iconOnly = false,
  isActive,
  renderExtra,
  selection = 'single',
  disabled = false,
  disabledTitle = '',
  className = '',
}) => {
  const checkActive = isActive ?? ((option) => option.value === value)
  const isSingle = selection === 'single'

  return (
    <div
      className={`ui-segmented ${className}`.trim()}
      role={isSingle ? 'radiogroup' : 'group'}
      aria-label={label}
    >
      {options.map((option) => {
        const { value: optValue, label: optLabel, Icon } = option
        const active = checkActive(option)
        return (
          <button
            key={optValue}
            type="button"
            role={isSingle ? 'radio' : undefined}
            className={`ui-segmented-btn ${active ? 'active' : ''} ${iconOnly ? 'ui-segmented-btn--icon' : ''}`.trim()}
            onClick={() => onChange(optValue, option)}
            disabled={disabled}
            title={disabled ? disabledTitle : (iconOnly ? optLabel : undefined)}
            aria-label={iconOnly ? optLabel : undefined}
            aria-checked={isSingle ? active : undefined}
            aria-pressed={isSingle ? undefined : active}
          >
            {Icon && <Icon size={iconOnly ? 18 : 14} />}
            {!iconOnly && <span>{optLabel}</span>}
            {renderExtra?.(option, active)}
          </button>
        )
      })}
    </div>
  )
}

export default Segmented
