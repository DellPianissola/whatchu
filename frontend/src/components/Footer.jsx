import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { checkHealth } from '../services/api'
import './Footer.css'

const FRONTEND_VERSION = __APP_VERSION__
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL || 'https://portfolio.dell-pianissola.workers.dev'
const TMDB_URL = 'https://www.themoviedb.org/'

const CURRENT_YEAR = new Date().getFullYear()

let apiVersionPromise = null
const getApiVersion = () => {
  if (apiVersionPromise) return apiVersionPromise
  apiVersionPromise = checkHealth()
    .then((data) => data?.version ?? null)
    .catch(() => null)
  return apiVersionPromise
}

const Footer = () => {
  const [apiVersion, setApiVersion] = useState(null)

  useEffect(() => {
    let cancelled = false
    getApiVersion().then((version) => {
      if (!cancelled) setApiVersion(version)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <footer className="app-footer">
      <div className="footer-inner">

        <div className="footer-top">
          <a href={TMDB_URL} target="_blank" rel="noopener noreferrer" className="footer-tmdb-link" aria-label="The Movie Database">
            <img src="/tmdb-logo.svg" alt="TMDB" className="footer-tmdb-logo" />
          </a>

          <details className="footer-legal">
            <summary className="footer-legal-trigger">
              <Info size={14} />
              <span>Atribuições</span>
            </summary>
            <div className="footer-legal-content">
              {/* Texto de atribuição obrigatório pela TMDB — não remover nem alterar. */}
              <p>Este produto usa o TMDB e as APIs do TMDB, mas não é endossado, certificado nem aprovado pelo TMDB.</p>
              {/* Disclosure obrigatório do Amazon Associates. */}
              <p>Como Associado da Amazon, podemos receber comissões por compras qualificadas.</p>
            </div>
          </details>
        </div>

        <div className="footer-meta">
          <span className="footer-copyright">© {CURRENT_YEAR} Whatchu</span>
          <span className="footer-meta-sep" aria-hidden="true">·</span>
          <span className="footer-version">
            v{FRONTEND_VERSION}{apiVersion && ` · API v${apiVersion}`}
          </span>
          <span className="footer-meta-sep" aria-hidden="true">·</span>
          <span className="footer-author-line">
            Feito por{' '}
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="footer-author">
              Gabriel Pianissola
            </a>
          </span>
        </div>

      </div>
    </footer>
  )
}

export default Footer
