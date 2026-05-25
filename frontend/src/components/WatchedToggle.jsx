import { Check, Eye } from 'lucide-react'
import './WatchedToggle.css'

const WatchedToggle = ({ watched, onToggle, className = '' }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onToggle() }}
    className={[
      'ui-watched-toggle',
      watched ? 'ui-watched-toggle--on' : '',
      className,
    ].filter(Boolean).join(' ')}
    aria-label={watched ? 'Marcar como não assistido' : 'Marcar como assistido'}
    aria-pressed={watched}
    title={watched ? 'Marcar como não assistido' : 'Marcar como assistido'}
  >
    <span aria-hidden="true">{watched ? <Check size={18} /> : <Eye size={18} />}</span>
  </button>
)

export default WatchedToggle
