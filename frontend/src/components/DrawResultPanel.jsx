import { Sparkles, Calendar, Star, Clock, X } from 'lucide-react'
import PosterPlaceholder from './PosterPlaceholder.jsx'
import GeoPlaceholder from './GeoPlaceholder.jsx'
import IconButton from './IconButton.jsx'
import { TYPE_LABEL, formatDuration } from '../utils/content.js'
import { providerUrl } from '../utils/providers.js'
import { useRichDetails } from '../hooks/useRichDetails.js'
import './DrawResultPanel.css'

const MAX_GENRE_CHIPS = 3

const collectProviders = (watchProviders) => {
  if (!watchProviders) return []
  const seen = new Set()
  return [...(watchProviders.streaming || []), ...(watchProviders.free || [])].filter((p) => {
    if (!providerUrl(p) || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

const DrawResultPanel = ({ item, isDrawing = false, onOpen, onClose, showProviders = false }) => {
  const { richDetails, richDetailsLoading } = useRichDetails(showProviders ? item : null)

  if (!item) {
    return (
      <GeoPlaceholder
        className="draw-placeholder"
        animated={isDrawing}
        hint={isDrawing ? 'Sorteando...' : 'O sorteado aparece aqui'}
      />
    )
  }

  const providers = showProviders ? collectProviders(richDetails?.watchProviders) : []
  const providersPending = showProviders && richDetailsLoading

  return (
    <div
      {...(onOpen
        ? { role: 'button', tabIndex: 0, onClick: onOpen, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } } }
        : {})}
      className={`draw-result-panel${onOpen ? ' is-interactive' : ''}`}
    >
      {item.poster ? (
        <img
          src={item.poster}
          alt=""
          className="draw-result-bg"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <PosterPlaceholder title={item.title} type={item.type} className="draw-result-bg" />
      )}
      <div className="draw-result-top">
        <span className="draw-result-label"><Sparkles size={16} /> Sorteado!</span>
        {onClose && (
          <IconButton
            icon={<X size={20} />}
            label="Fechar sorteio"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="btn-close-draw"
          />
        )}
      </div>
      <div className="draw-result-content">
        <div className="draw-result-meta">
          <span className="draw-type">{TYPE_LABEL[item.type] ?? item.type}</span>
          {item.year && <span className="draw-meta-item"><Calendar size={14} /> {item.year}</span>}
          {item.rating && <span className="draw-meta-item"><Star size={14} /> {item.rating}</span>}
          {item.type === 'MOVIE' && item.duration && <span className="draw-meta-item"><Clock size={14} /> {formatDuration(item.duration)}</span>}
          {item.genres?.slice(0, MAX_GENRE_CHIPS).map((g) => (
            <span key={g} className="draw-result-genre-chip">{g}</span>
          ))}
        </div>
        <h4 className="draw-result-title">{item.title}</h4>
        {providersPending ? (
          <div className="draw-result-providers">
            <div className="draw-result-providers-logos">
              <span className="draw-result-provider-skeleton" />
              <span className="draw-result-provider-skeleton" />
              <span className="draw-result-provider-skeleton" />
            </div>
          </div>
        ) : providers.length > 0 ? (
          <div className="draw-result-providers">
            <div className="draw-result-providers-logos">
              {providers.map((p) => (
                <a
                  key={p.id}
                  href={providerUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="draw-result-provider"
                  aria-label={p.name}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src={p.logo} alt={p.name} loading="lazy" />
                  <span className="draw-result-provider-tip">{p.name}</span>
                </a>
              ))}
            </div>
          </div>
        ) : (
          item.description && <p className="draw-result-description">{item.description}</p>
        )}
      </div>
    </div>
  )
}

export default DrawResultPanel
