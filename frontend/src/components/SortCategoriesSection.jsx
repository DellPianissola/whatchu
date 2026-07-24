import Button from './Button.jsx'

const SortCategoriesSection = ({
  label = 'Ordenar por',
  categories,
  value,
  onChange,
  disabled = false,
}) => {
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
                onClick={() => onChange(optValue)}
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
