import './ErrorMessage.css'

const ErrorMessage = ({ children, className = '' }) => {
  if (!children) return null
  return (
    <div className={`ui-error-message ${className}`.trim()} role="alert">
      {children}
    </div>
  )
}

export default ErrorMessage
