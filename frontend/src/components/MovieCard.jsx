import PosterPlaceholder from './PosterPlaceholder.jsx'
import { displayYear, displayRating, displayGenres } from '../utils/content'
import './MovieCard.css'

const isActivationKey = (event) => event.key === 'Enter' || event.key === ' '

export const MovieCardPoster = ({ item, overlay, badge }) => (
  <div className="ui-movie-card-poster">
    {item.poster ? (
      <img
        src={item.poster}
        alt={item.title}
        className="ui-movie-card-poster-img"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <PosterPlaceholder
        title={item.title}
        type={item.type}
        className="ui-movie-card-poster-img"
      />
    )}
    {badge && <span className="ui-movie-card-poster-badge">{badge}</span>}
    {overlay && <div className="ui-movie-card-poster-overlay">{overlay}</div>}
  </div>
)

export const MovieCardMeta = ({ item }) => {
  const genres = displayGenres(item.genres)
  return (
    <div className="ui-movie-card-meta">
      <span>📅 {displayYear(item.year)}</span>
      <span>⭐ {displayRating(item.rating)}</span>
      <span className="ui-movie-card-meta-genres" title={genres}>🎭 {genres}</span>
    </div>
  )
}

const MovieCard = ({
  item,
  onClick,
  posterOverlay,
  posterBadge,
  titleBadge,
  actions,
  watched = false,
  className = '',
}) => {
  const interactive = Boolean(onClick)

  const onKeyDown = (event) => {
    if (interactive && isActivationKey(event)) {
      event.preventDefault()
      onClick(event)
    }
  }

  return (
    <article
      className={[
        'ui-movie-card',
        watched ? 'ui-movie-card--watched' : '',
        interactive ? 'ui-movie-card--interactive' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      onKeyDown={interactive ? onKeyDown : undefined}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
    >
      <MovieCardPoster item={item} overlay={posterOverlay} badge={posterBadge} />
      <div className="ui-movie-card-info">
        <header className="ui-movie-card-header">
          <h3 className="ui-movie-card-title">{item.title}</h3>
          {titleBadge}
        </header>
        <div className="ui-movie-card-footer">
          <MovieCardMeta item={item} />
          {actions && <div className="ui-movie-card-actions">{actions}</div>}
        </div>
      </div>
    </article>
  )
}

export default MovieCard
