import './SearchInput.css'

const SearchInput = ({ value, onChange, placeholder = 'Buscar...', className = '', ...rest }) => (
  <input
    type="text"
    className={`ui-search-input ${className}`.trim()}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    {...rest}
  />
)

export default SearchInput
