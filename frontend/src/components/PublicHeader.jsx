import { Link } from 'react-router-dom'
import Wordmark from './Wordmark.jsx'
import { ROUTES } from '../constants/routes.js'
import './PublicHeader.css'

const PublicHeader = () => (
  <header className="public-header">
    <Link to={ROUTES.LANDING} className="public-header-logo" aria-label="Whatchu — Início">
      <Wordmark variant="nav" logoSize={28} as="span" />
    </Link>

    <nav className="public-header-actions">
      <Link to={ROUTES.LOGIN} className="public-header-link">Entrar</Link>
      <Link to={ROUTES.REGISTER} className="public-header-cta">Criar conta</Link>
    </nav>
  </header>
)

export default PublicHeader
