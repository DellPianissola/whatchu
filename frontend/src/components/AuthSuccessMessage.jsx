import { Mail } from 'lucide-react'
import './AuthSuccessMessage.css'

const AuthSuccessMessage = ({ icon, title, children, action }) => (
  <div className="ui-auth-success">
    <div className="ui-auth-success-icon" aria-hidden="true">{icon ?? <Mail size={48} strokeWidth={1.5} />}</div>
    {title && <h2 className="ui-auth-success-title">{title}</h2>}
    {children && <div className="ui-auth-success-body">{children}</div>}
    {action && <div className="ui-auth-success-action">{action}</div>}
  </div>
)

export default AuthSuccessMessage
