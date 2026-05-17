import './PosterPlaceholder.css'

const PosterPlaceholder = ({ title, type, className = '' }) => {
  const getIcon = () => {
    switch (type) {
      case 'SERIES':
      case 'series':
        return '📺'
      case 'MOVIE':
      case 'movie':
      default:
        return '🎬'
    }
  }

  return (
    <div className={`poster-placeholder ${className}`}>
      <div className="poster-placeholder-icon">{getIcon()}</div>
      <div className="poster-placeholder-text">{title}</div>
    </div>
  )
}

export default PosterPlaceholder
