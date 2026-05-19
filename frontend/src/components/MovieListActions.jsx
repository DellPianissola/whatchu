import PriorityIndicator from './PriorityIndicator.jsx'
import './MovieListActions.css'

const MovieListActions = ({
  movie,
  onRemove,
  onChangePriority,
  isConfirmingDelete = false,
  onRequestDelete,
  className = '',
}) => {
  const supportsTwoStep = typeof onRequestDelete === 'function'
  const handleClick = (e) => {
    e.stopPropagation()
    if (supportsTwoStep) {
      isConfirmingDelete ? onRemove() : onRequestDelete()
    } else {
      onRemove()
    }
  }

  return (
    <div className={`ui-movie-list-actions ${className}`.trim()}>
      <button
        type="button"
        onClick={handleClick}
        className={[
          'ui-movie-list-actions-remove',
          isConfirmingDelete ? 'ui-movie-list-actions-remove--confirming' : '',
        ].filter(Boolean).join(' ')}
      >
        {isConfirmingDelete ? 'Confirmar' : '🗑️ Remover'}
      </button>
      <PriorityIndicator
        value={movie.priority}
        onChange={onChangePriority}
      />
    </div>
  )
}

export default MovieListActions
