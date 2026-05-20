import WatchuLogo from './WatchuLogo.jsx'
import './Wordmark.css'

const Wordmark = ({ variant = 'auth', logoSize = 44, showLogo = true, subtitle, as: As = 'h1' }) => (
  <div className={`ui-wordmark ui-wordmark--${variant}`}>
    {showLogo && <WatchuLogo size={logoSize} />}
    <div className="ui-wordmark-text-group">
      <As className="ui-wordmark-text">Whatchu</As>
      {subtitle && <p className="ui-wordmark-subtitle">{subtitle}</p>}
    </div>
  </div>
)

export default Wordmark
