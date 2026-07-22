import { Info } from 'lucide-react'
import IconButton from './IconButton.jsx'

const PosterDetailsButton = ({ onOpen }) => (
  <IconButton
    icon={<Info size={16} />}
    label="Ver detalhes"
    size="sm"
    className="ui-poster-details-btn"
    onClick={(e) => { e.stopPropagation(); onOpen() }}
  />
)

export default PosterDetailsButton
