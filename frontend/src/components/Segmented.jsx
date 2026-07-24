import './Segmented.css'

/**
 * Segmented control single-select.
 *
 * Props:
 *   options     — array de { value, label, Icon }
 *   value       — valor selecionado
 *   onChange    — recebe (value, option)
 *   label       — aria-label do grupo
 *   iconOnly    — esconde o texto; label vira title + aria-label do botão
 *   isActive    — override de qual opção está ativa, default value === option.value
 *   renderExtra — nó extra dentro do botão, recebe (option, active)
 */
const Segmented = ({
  options,
  value,
  onChange,
  label,
  iconOnly = false,
  isActive,
  renderExtra,
  disabled = false,
  disabledTitle = '',
  className = '',
}) => {
  const checkActive = isActive ?? ((option) => option.value === value)

  return (
    <div className={`ui-segmented ${className}`.trim()} role="group" aria-label={label}>
      {options.map((option) => {
        const { value: optValue, label: optLabel, Icon } = option
        const active = checkActive(option)
        return (
          <button
            key={optValue}
            type="button"
            className={`ui-segmented-btn ${active ? 'active' : ''} ${iconOnly ? 'ui-segmented-btn--icon' : ''}`.trim()}
            onClick={() => onChange(optValue, option)}
            disabled={disabled}
            title={disabled ? disabledTitle : (iconOnly ? optLabel : undefined)}
            aria-label={iconOnly ? optLabel : undefined}
            aria-pressed={active}
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
