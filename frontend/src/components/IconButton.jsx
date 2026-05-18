import './IconButton.css'

const IconButton = ({ icon, label, onClick, className = '', size = 'md', ...rest }) => {
  if (!label) {
    throw new Error('IconButton: prop "label" é obrigatória (acessibilidade)')
  }
  return (
    <button
      type="button"
      className={`ui-icon-btn ui-icon-btn--${size} ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

export default IconButton
