import { useState } from 'react'
import { getConsent, acceptAnalytics, declineAnalytics } from '../services/analytics'
import './CookieBanner.css'

const CookieBanner = () => {
  const [visible, setVisible] = useState(() => getConsent() === null)

  const handleAccept = () => {
    acceptAnalytics()
    setVisible(false)
  }

  const handleDecline = () => {
    declineAnalytics()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="dialog" aria-label="Preferências de cookies">
      <p className="cookie-banner__text">
        Usamos cookies de análise para entender como o site é utilizado e melhorá-lo.
        Nenhum dado pessoal é compartilhado com terceiros.
      </p>
      <div className="cookie-banner__actions">
        <button className="cookie-banner__btn cookie-banner__btn--decline" onClick={handleDecline}>
          Recusar
        </button>
        <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={handleAccept}>
          Aceitar
        </button>
      </div>
    </div>
  )
}

export default CookieBanner
