import { Fragment } from 'react'
import Dropdown from './Dropdown.jsx'

const DrawFilterDropdowns = ({
  variant = 'pills',
  availableGenres,
  genres,
  onGenresChange,
  streamingOptions,
  providers,
  onProvidersChange,
}) => {
  const isSheet = variant === 'sheet'

  const fields = [
    { key: 'genre', label: 'Gênero', options: availableGenres, value: genres, onChange: onGenresChange },
    { key: 'streaming', label: 'Streaming', options: streamingOptions, value: providers, onChange: onProvidersChange },
  ]

  return fields.map(({ key, label, options, value, onChange }) => {
    if (!options.length) return null

    const dropdown = (
      <Dropdown
        multi
        trigger={isSheet ? 'button' : 'pill'}
        align="left"
        label={isSheet ? 'Selecionar' : label}
        options={options}
        value={value}
        onChange={onChange}
      />
    )

    return isSheet ? (
      <section key={key} className="filter-section">
        <span className="filter-section-label">{label}</span>
        {dropdown}
      </section>
    ) : (
      <Fragment key={key}>{dropdown}</Fragment>
    )
  })
}

export default DrawFilterDropdowns
