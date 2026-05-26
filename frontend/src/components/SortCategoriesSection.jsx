import Button from './Button.jsx'

const SortCategoriesSection = ({
  label = 'Ordenar por',
  categories,
  value,
  onChange,
  disabled = false,
  deselectable = false,
}) => {
  const handleClick = (optionValue) => {
    if (deselectable && value === optionValue) onChange(null)
    else onChange(optionValue)
  }

  return (
    <section className="filter-section">
      <span className="filter-section-label">{label}</span>
      {categories.map(({ Icon: CategoryIcon, label: catLabel, options }) => (
        <div key={catLabel} className="filter-sort-group">
          <span className="filter-sort-group-label">
            <CategoryIcon size={14} /> {catLabel}
          </span>
          <div className="filter-chip-group">
            {options.map(({ value: optValue, ariaLabel, Icon: ArrowIcon }) => (
              <Button
                key={optValue}
                variant="filter"
                size="sm"
                pill
                active={value === optValue}
                disabled={disabled}
                onClick={() => handleClick(optValue)}
                aria-label={ariaLabel}
                title={ariaLabel}
              >
                <ArrowIcon size={16} />
              </Button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

export default SortCategoriesSection
