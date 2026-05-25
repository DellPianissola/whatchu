import { Play, Calendar, Star, Clock, Tags, AlertTriangle, X } from 'lucide-react'
import PosterPlaceholder from './PosterPlaceholder.jsx'
import IconButton from './IconButton.jsx'
import { Skeleton } from './Skeleton.jsx'
import { trailerUrl } from '../utils/detailsCache.js'
import { TYPE_LABEL, formatDuration, displayRating, displayGenres } from '../utils/content.js'
import { providerUrl } from '../utils/providers.js'
import { ageRatingTier } from '../utils/ageRating.js'
import { useEscapeKey } from '../hooks/useEscapeKey.js'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js'
import { useRichDetails } from '../hooks/useRichDetails.js'
import './CardModal.css'

const TITLE_ID = 'card-modal-title'

const PROVIDER_GROUPS = [
  { key: 'streaming', label: 'Streaming' },
  { key: 'free',      label: 'Grátis'    },
  { key: 'rent',      label: 'Alugar'    },
  { key: 'buy',       label: 'Comprar'   },
]

const ProviderLogo = ({ provider }) => {
  const url = providerUrl(provider)
  const content = (
    <>
      <img
        src={provider.logo}
        alt={provider.name}
        className="card-modal-provider-logo"
      />
      <span className="card-modal-provider-tooltip">{provider.name}</span>
    </>
  )
  if (!url) {
    return <span className="card-modal-provider-wrap">{content}</span>
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-modal-provider-wrap"
      aria-label={provider.name}
    >
      {content}
    </a>
  )
}

const WatchProviders = ({ providers, trailer }) => {
  const groups = providers
    ? PROVIDER_GROUPS.filter(g => providers[g.key]?.length > 0)
    : []
  const hasProviders = groups.length > 0
  const trailerHref = trailerUrl(trailer)
  if (!hasProviders && !trailerHref) return null

  return (
    <div className="card-modal-providers">
      <div className="card-modal-providers-header">
        <span className="card-modal-detail-label">Onde assistir</span>
        {trailerHref && (
          <a
            href={trailerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-trailer-subtle"
          >
            <Play size={14} fill="currentColor" /> Trailer
          </a>
        )}
      </div>
      {hasProviders && (
        <div className="card-modal-providers-groups">
          {groups.map(({ key, label }) => (
            <div key={key} className="card-modal-providers-group">
              <span className="card-modal-providers-group-label">{label}</span>
              <div className="card-modal-providers-logos">
                {providers[key].map(p => <ProviderLogo key={p.id} provider={p} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {hasProviders && (
        <p className="card-modal-providers-source">Dados via JustWatch</p>
      )}
    </div>
  )
}

const buildYearLabel = (item, richDetails) => {
  if (!item.year) return 'Sem data'
  if (item.type !== 'SERIES' || !richDetails) return item.year
  const end = richDetails.endYear
  if (richDetails.hasEnded) return end && end !== item.year ? `${item.year} – ${end}` : item.year
  return `${item.year} – ...`
}

const CardModal = ({ item, onClose, actions, posterOverlay }) => {
  useEscapeKey(onClose, !!item)
  useBodyScrollLock(!!item)
  const { richDetails, richDetailsLoading, richDetailsError } = useRichDetails(item)

  if (!item) return null

  const duration = richDetails?.duration || item.duration
  const ageRating = richDetails?.ageRating
  const yearLabel = buildYearLabel(item, richDetails)

  return (
    <div className="card-modal-backdrop" onClick={onClose}>
      <div
        className="card-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
      >
        <IconButton icon={<X size={20} />} label="Fechar" onClick={onClose} className="card-modal-close" />
        <div className="card-modal-body">

          <div className="card-modal-poster-col">
            {item.poster ? (
              <img src={item.poster} alt={item.title} loading="lazy" decoding="async" />
            ) : (
              <PosterPlaceholder title={item.title} type={item.type} className="result-poster" />
            )}
            {posterOverlay}
          </div>

          <div className="card-modal-info">
            <div className="card-modal-title-row">
              <h2 id={TITLE_ID}>{item.title}</h2>
              <span className="card-modal-type-badge">
                {TYPE_LABEL[item.type] ?? item.type}
              </span>
            </div>

            <div className="card-modal-meta">
              <span><Calendar size={14} /> {yearLabel}</span>
              <span><Star size={14} /> {displayRating(item.rating)}</span>
              {item.type === 'MOVIE' && duration && <span><Clock size={14} /> {formatDuration(duration)}</span>}
              {ageRating && (
                <span
                  className={`age-rating age-rating--tier-${ageRatingTier(ageRating)}`}
                  title={`Classificação ${ageRating.region}`}
                >
                  {ageRating.value}
                </span>
              )}
            </div>

            <div className="card-modal-genres">
              <Tags size={14} /> {displayGenres(item.genres)}
            </div>

            <p className="card-modal-description">
              {item.description || 'Sem sinopse disponível.'}
            </p>

            {richDetailsLoading && (
              <div className="card-modal-rich-skeleton">
                <Skeleton width="70%" height={12} />
                <Skeleton width="90%" height={12} />
                <Skeleton width="50%" height={12} />
              </div>
            )}

            {!richDetailsLoading && richDetailsError && (
              <div className="card-modal-rich-error" role="status">
                <AlertTriangle size={14} /> {richDetailsError}
              </div>
            )}

            {!richDetailsLoading && richDetails && (
              <div className="card-modal-rich-details">
                {richDetails.director && (
                  <div className="card-modal-detail-row">
                    <span className="card-modal-detail-label">Direção</span>
                    <span>{richDetails.director}</span>
                  </div>
                )}
                {richDetails.cast?.length > 0 && (
                  <div className="card-modal-detail-row">
                    <span className="card-modal-detail-label">Elenco</span>
                    <span>{richDetails.cast.join(', ')}</span>
                  </div>
                )}
                {richDetails.seasons && (
                  <div className="card-modal-detail-row">
                    <span className="card-modal-detail-label">Temporadas</span>
                    <span>{richDetails.seasons}</span>
                  </div>
                )}
                {richDetails.episodes && (
                  <div className="card-modal-detail-row">
                    <span className="card-modal-detail-label">Episódios</span>
                    <span>{richDetails.episodes}</span>
                  </div>
                )}
                {richDetails.studios?.length > 0 && (
                  <div className="card-modal-detail-row">
                    <span className="card-modal-detail-label">Estúdio</span>
                    <span>{richDetails.studios.join(', ')}</span>
                  </div>
                )}
                {richDetails.status && (
                  <div className="card-modal-detail-row">
                    <span className="card-modal-detail-label">Status</span>
                    <span>{richDetails.status}</span>
                  </div>
                )}
                <WatchProviders
                  providers={richDetails.watchProviders}
                  trailer={richDetails.trailer}
                />
              </div>
            )}

            {actions != null && (
              <div className="card-modal-actions">
                {actions}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default CardModal
