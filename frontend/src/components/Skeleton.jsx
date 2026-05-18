import './Skeleton.css'

export const Skeleton = ({ width, height, radius, className = '' }) => (
  <span
    className={`ui-skeleton ${className}`.trim()}
    style={{ width, height, borderRadius: radius }}
    aria-hidden="true"
  />
)

export const SkeletonCard = () => (
  <div className="ui-skeleton-card" aria-hidden="true">
    <Skeleton className="ui-skeleton-card-poster" />
    <Skeleton className="ui-skeleton-card-line" />
    <Skeleton className="ui-skeleton-card-line ui-skeleton-card-line--short" />
  </div>
)

export default Skeleton
