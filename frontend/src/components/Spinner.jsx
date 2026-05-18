import './Spinner.css'

const Spinner = ({ size = 'md', label = 'Carregando' }) => (
  <span
    className={`ui-spinner ui-spinner--${size}`}
    role="status"
    aria-label={label}
  />
)

export default Spinner
