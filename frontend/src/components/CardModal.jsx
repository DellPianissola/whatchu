import { useState } from 'react'
import { Play, Star, X, ChevronDown } from 'lucide-react'
import PosterPlaceholder from './PosterPlaceholder.jsx'
import GeoPlaceholder from './GeoPlaceholder.jsx'
import IconButton from './IconButton.jsx'
import { Skeleton } from './Skeleton.jsx'
import { trailerUrl } from '../utils/detailsCache.js'
import { TYPE_LABEL, formatDuration, displayRating } from '../utils/content.js'
import { providerUrl } from '../utils/providers.js'
import { ageRatingTier } from '../utils/ageRating.js'
import { useEscapeKey } from '../hooks/useEscapeKey.js'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js'
import { useRichDetails } from '../hooks/useRichDetails.js'
import './CardModal.css'

const TITLE_ID = 'card-modal-title'

const DESCRIPTION_MAX_LINES = 4
const DESCRIPTION_EXPAND_THRESHOLD = 150

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
      <img src={provider.logo} alt={provider.name} className="ui-detail-provider-logo" />
      <span className="ui-detail-provider-tip">{provider.name}</span>
    </>
  )
  if (!url) return <span className="ui-detail-provider">{content}</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="ui-detail-provider" aria-label={provider.name}>
      {content}
    </a>
  )
}

const buildYearLabel = (item, richDetails) => {
  if (!item.year) return null
  if (item.type !== 'SERIES' || !richDetails) return String(item.year)
  const end = richDetails.endYear
  if (richDetails.hasEnded) return end && end !== item.year ? `${item.year} – ${end}` : String(item.year)
  return `${item.year} – ...`
}

const Stat = ({ label, value }) => (
  <div className="ui-detail-stat">
    <span className="ui-detail-stat-value">{value}</span>
    <span className="ui-detail-stat-label">{label}</span>
  </div>
)

const CardModal = ({ item, onClose, actions, posterOverlay }) => {
  useEscapeKey(onClose, !!item)
  useBodyScrollLock(!!item)
  const { richDetails, richDetailsLoading, richDetailsError } = useRichDetails(item)
  const [descriptionOpen, setDescriptionOpen] = useState(false)

  if (!item) return null

  const duration  = richDetails?.duration || item.duration
  const ageRating = richDetails?.ageRating
  const yearLabel = buildYearLabel(item, richDetails)
  const backdrop  = richDetails?.backdrop
  const poster    = item.poster
  // Evita flash poster→backdrop: enquanto richDetails carrega, mostra placeholder.
  // Depois resolve pra backdrop (preferido) ou poster (fallback) sem trocar.
  const heroImage = richDetailsLoading ? null : (backdrop || poster)
  const trailerHref = trailerUrl(richDetails?.trailer)
  const providers = richDetails?.watchProviders
  const providerGroups = providers
    ? PROVIDER_GROUPS.filter(g => providers[g.key]?.length > 0)
    : []
  const hasProviders = providerGroups.length > 0

  const description = item.description?.trim()
  const canExpandDescription = description && description.length > DESCRIPTION_EXPAND_THRESHOLD

  const hasSeries = richDetails?.seasons || richDetails?.episodes
  const hasCrew   = richDetails?.director || richDetails?.cast?.length > 0 || richDetails?.studios?.length > 0
  const hasMeta   = richDetails?.status || hasSeries

  const titleBlock = (
    <div className="ui-detail-title-block">
      <div className="ui-detail-pills">
        <span className="ui-detail-type">{TYPE_LABEL[item.type] ?? item.type}</span>
        {item.rating && (
          <span className="ui-detail-rating"><Star size={12} fill="currentColor" /> {displayRating(item.rating)}</span>
        )}
        {ageRating && (
          <span
            className={`age-rating age-rating--tier-${ageRatingTier(ageRating)}`}
            title={`Classificação ${ageRating.region}`}
          >
            {ageRating.value}
          </span>
        )}
      </div>
      <h2 id={TITLE_ID} className="ui-detail-title">{item.title}</h2>
      {(yearLabel || duration) && (
        <p className="ui-detail-subtitle">
          {[yearLabel, duration && item.type === 'MOVIE' ? formatDuration(duration) : null]
            .filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )

  return (
    <div className="ui-detail-backdrop" onClick={onClose}>
      <article
        className={`ui-detail-modal ${heroImage ? '' : 'ui-detail-modal--noimage'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
      >
        {/* Desktop: poster vertical à esquerda */}
        <aside className="ui-detail-poster">
          {poster ? (
            <img src={poster} alt={item.title} loading="lazy" decoding="async" />
          ) : (
            <PosterPlaceholder title={item.title} type={item.type} />
          )}
          {posterOverlay}
        </aside>

        {/* Mobile: hero backdrop overlay com título */}
        <header className="ui-detail-hero">
          {richDetailsLoading ? (
            <GeoPlaceholder animated hint="Carregando..." />
          ) : heroImage ? (
            <img
              src={heroImage}
              alt=""
              className={`ui-detail-hero-image ${backdrop ? '' : 'is-poster'}`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="ui-detail-hero-placeholder">
              <PosterPlaceholder title={item.title} type={item.type} />
            </div>
          )}
          <div className="ui-detail-hero-gradient" aria-hidden="true" />

          <div className="ui-detail-hero-foot">
            {titleBlock}
          </div>
        </header>

        <div className="ui-detail-main">
          <IconButton
            icon={<X size={20} />}
            label="Fechar"
            onClick={onClose}
            className="ui-detail-close"
          />

          {/* Desktop: título no topo da coluna info */}
          <div className="ui-detail-desktop-header">
            {titleBlock}
          </div>

          <div className="ui-detail-content">

          {item.genres?.length > 0 && (
            <div className="ui-detail-genres">
              {item.genres.map(g => (
                <span key={g} className="ui-detail-genre">{g}</span>
              ))}
            </div>
          )}

          {description && (
            <div className={`ui-detail-description-wrap ${descriptionOpen ? 'is-expanded' : ''}`}>
              <p
                className="ui-detail-description"
                style={{ WebkitLineClamp: descriptionOpen ? 'unset' : DESCRIPTION_MAX_LINES }}
              >
                {description}
              </p>
              {canExpandDescription && (
                <button
                  type="button"
                  className="ui-detail-description-toggle"
                  onClick={() => setDescriptionOpen(o => !o)}
                >
                  {descriptionOpen ? 'Ver menos' : 'Ver mais'}
                  <ChevronDown size={14} className={descriptionOpen ? 'is-flipped' : ''} />
                </button>
              )}
            </div>
          )}

          {richDetailsLoading && (
            <div className="ui-detail-loading">
              <Skeleton width="70%" height={12} />
              <Skeleton width="90%" height={12} />
              <Skeleton width="50%" height={12} />
            </div>
          )}

          {!richDetailsLoading && richDetailsError && (
            <p className="ui-detail-error" role="status">{richDetailsError}</p>
          )}

          {!richDetailsLoading && hasMeta && (
            <section className="ui-detail-section">
              <span className="ui-detail-section-label">Sobre</span>
              <div className="ui-detail-stats">
                {richDetails.seasons && <Stat label="Temporadas" value={richDetails.seasons} />}
                {richDetails.episodes && <Stat label="Episódios" value={richDetails.episodes} />}
                {item.type === 'MOVIE' && duration && <Stat label="Duração" value={formatDuration(duration)} />}
                {richDetails.status && <Stat label="Status" value={richDetails.status} />}
              </div>
            </section>
          )}

          {!richDetailsLoading && hasCrew && (
            <section className="ui-detail-section">
              <span className="ui-detail-section-label">Equipe</span>
              <div className="ui-detail-rows">
                {richDetails.director && (
                  <div className="ui-detail-row">
                    <span className="ui-detail-row-label">Direção</span>
                    <span className="ui-detail-row-value">{richDetails.director}</span>
                  </div>
                )}
                {richDetails.cast?.length > 0 && (
                  <div className="ui-detail-row">
                    <span className="ui-detail-row-label">Elenco</span>
                    <span className="ui-detail-row-value">{richDetails.cast.join(', ')}</span>
                  </div>
                )}
                {richDetails.studios?.length > 0 && (
                  <div className="ui-detail-row">
                    <span className="ui-detail-row-label">Estúdio</span>
                    <span className="ui-detail-row-value">{richDetails.studios.join(', ')}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {!richDetailsLoading && (hasProviders || trailerHref) && (
            <section className="ui-detail-section">
              <div className="ui-detail-section-header">
                <span className="ui-detail-section-label">Onde assistir</span>
                {trailerHref && (
                  <a href={trailerHref} target="_blank" rel="noopener noreferrer" className="ui-detail-trailer-btn">
                    <Play size={14} fill="currentColor" /> Trailer
                  </a>
                )}
              </div>
              {hasProviders ? (
                <div className="ui-detail-providers">
                  {providerGroups.map(({ key, label }) => (
                    <div key={key} className="ui-detail-provider-group">
                      <span className="ui-detail-provider-group-label">{label}</span>
                      <div className="ui-detail-provider-logos">
                        {providers[key].map(p => <ProviderLogo key={p.id} provider={p} />)}
                      </div>
                    </div>
                  ))}
                  <p className="ui-detail-provider-source">Dados via JustWatch</p>
                </div>
              ) : (
                <p className="ui-detail-empty">Sem opções de streaming disponíveis no momento.</p>
              )}
            </section>
          )}

          </div>

          {actions != null && (
            <footer className="ui-detail-actions">{actions}</footer>
          )}
        </div>
      </article>
    </div>
  )
}

export default CardModal
