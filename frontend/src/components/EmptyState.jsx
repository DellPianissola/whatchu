import './EmptyState.css'

const EmptyState = ({ icon, title, description, action, className = '' }) => (
  <div className={`ui-empty ${className}`.trim()}>
    {icon && <div className="ui-empty-icon" aria-hidden="true">{icon}</div>}
    {title && <h3 className="ui-empty-title">{title}</h3>}
    {description && <p className="ui-empty-description">{description}</p>}
    {action && <div className="ui-empty-action">{action}</div>}
  </div>
)

export default EmptyState
