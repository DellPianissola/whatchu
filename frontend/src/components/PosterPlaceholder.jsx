import { Film, Tv } from 'lucide-react'
import './PosterPlaceholder.css'

const PosterPlaceholder = ({ title, type, className = '' }) => {
  const isSeries = type === 'SERIES' || type === 'series'
  const Icon = isSeries ? Tv : Film

  return (
    <div className={`poster-placeholder ${className}`}>
      <div className="poster-placeholder-icon"><Icon size={48} strokeWidth={1.5} /></div>
      <div className="poster-placeholder-text">{title}</div>
    </div>
  )
}

export default PosterPlaceholder
