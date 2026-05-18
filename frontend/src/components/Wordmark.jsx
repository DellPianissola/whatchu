import WatchuLogo from './WatchuLogo.jsx'
import './Wordmark.css'

const Wordmark = ({ variant = 'auth', logoSize = 44, showLogo = true, as: As = 'h1' }) => (
  <div className={`ui-wordmark ui-wordmark--${variant}`}>
    {showLogo && <WatchuLogo size={logoSize} />}
    <As className="ui-wordmark-text">
      What<span className="ui-wordmark-accent">chu</span>
    </As>
  </div>
)

export default Wordmark
