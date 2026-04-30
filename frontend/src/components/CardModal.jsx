import { useEffect } from 'react'
import PosterPlaceholder from './PosterPlaceholder.jsx'
import { trailerUrl } from '../utils/detailsCache.js'
import './CardModal.css'

const TYPE_LABEL = { MOVIE: 'Filme', SERIES: 'Série', ANIME: 'Anime' }

const formatDuration = (minutes) => {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

/**
 * Modal de detalhes reutilizado em Search e MyList.
 *
 * Props:
 *   item              — objeto do item aberto (externalId, title, type, poster, etc.)
 *   richDetails       — dados extras buscados pela API (diretor, elenco, trailer, …)
 *   richDetailsLoading — boolean enquanto os dados extras carregam
 *   onClose           — callback ao fechar
 *   actions           — JSX com os botões de ação específicos de cada tela
 */
const CardModal = ({ item, richDetails, richDetailsLoading, onClose, actions }) => {
  // ESC fecha o modal; body fica sem scroll enquanto aberto
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!item) return null

  const duration = richDetails?.duration || item.duration

  return (
    <div className="card-modal-backdrop" onClick={onClose}>
      <div className="card-modal" onClick={(e) => e.stopPropagation()}>
        <button className="card-modal-close" onClick={onClose}>✕</button>
        <div className="card-modal-body">

          <div className="card-modal-poster-col">
            {item.poster ? (
              <img src={item.poster} alt={item.title} />
            ) : (
              <PosterPlaceholder title={item.title} type={item.type} className="result-poster" />
            )}
          </div>

          <div className="card-modal-info">
            <div className="card-modal-title-row">
              <h2>{item.title}</h2>
              <span className="result-type-badge" style={{ position: 'static' }}>
                {TYPE_LABEL[item.type] ?? item.type}
              </span>
            </div>

            <div className="card-modal-meta">
              <span>📅 {item.year || 'Sem data'}</span>
              <span>⭐ {item.rating || 'Sem nota'}</span>
              {item.type === 'MOVIE' && duration && <span>⏱ {formatDuration(duration)}</span>}
            </div>

            <div className="card-modal-genres">
              🎭 {item.genres?.length > 0 ? item.genres.join(', ') : 'Sem gênero'}
            </div>

            <p className="card-modal-description">
              {item.description || 'Sem sinopse disponível.'}
            </p>

            {richDetailsLoading && (
              <div className="card-modal-rich-skeleton">
                <div className="skeleton-meta" style={{ width: '70%' }}></div>
                <div className="skeleton-meta" style={{ width: '90%' }}></div>
                <div className="skeleton-meta" style={{ width: '50%' }}></div>
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
                {trailerUrl(richDetails.trailer) && (
                  <a
                    href={trailerUrl(richDetails.trailer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-trailer"
                  >
                    ▶ Ver Trailer
                  </a>
                )}
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
