import Wordmark from './Wordmark.jsx'
import './AuthShell.css'

const AuthShell = ({ subtitle, children, footer }) => (
  <div className="ui-auth-shell">
    <div className="ui-auth-shell-container">
      <div className="ui-auth-shell-card">
        <header className="ui-auth-shell-header">
          <Wordmark variant="auth" />
          {subtitle && <p className="ui-auth-shell-subtitle">{subtitle}</p>}
        </header>
        <div className="ui-auth-shell-body">{children}</div>
        {footer && <footer className="ui-auth-shell-footer">{footer}</footer>}
      </div>
    </div>
  </div>
)

export default AuthShell
