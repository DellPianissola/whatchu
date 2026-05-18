import { useEffect, useState } from 'react'
import { checkHealth } from '../services/api'
import './Footer.css'

const FRONTEND_VERSION = __APP_VERSION__
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL || 'https://portfolio.dell-pianissola.workers.dev'
const TMDB_URL = 'https://www.themoviedb.org/'

const CURRENT_YEAR = new Date().getFullYear()

const Footer = () => {
  const [apiVersion, setApiVersion] = useState(null)

  useEffect(() => {
    let cancelled = false
    checkHealth()
      .then(({ data }) => { if (!cancelled) setApiVersion(data?.version ?? null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <footer className="app-footer">
      <div className="footer-inner">

        <div className="footer-col footer-col--left">
          <span className="footer-copyright">© {CURRENT_YEAR} Whatchu</span>
          <span className="footer-version">
            v{FRONTEND_VERSION}
            {apiVersion && ` · API v${apiVersion}`}
          </span>
        </div>

        <div className="footer-col footer-col--center">
          <div className="footer-credits">
            <a href={TMDB_URL} target="_blank" rel="noopener noreferrer" className="footer-tmdb-link">
              <img src="/tmdb-logo.svg" alt="TMDB" className="footer-tmdb-logo" />
            </a>
          </div>
          {/* Texto de atribuição obrigatório pela TMDB — não remover nem alterar. */}
          <p className="footer-disclaimer">
            Este produto usa o TMDB e as APIs do TMDB, mas não é endossado,
            certificado nem aprovado pelo TMDB.
          </p>
          {/* Disclosure obrigatório do Amazon Associates. */}
          <p className="footer-disclaimer">
            Como Associado da Amazon, podemos receber comissões por compras qualificadas.
          </p>
        </div>

        <div className="footer-col footer-col--right">
          <span>Desenvolvido por</span>
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="footer-author">
            Gabriel Pianissola
          </a>
        </div>

      </div>
    </footer>
  )
}

export default Footer
