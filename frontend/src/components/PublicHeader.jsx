import { Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme.js'
import Wordmark from './Wordmark.jsx'
import IconButton from './IconButton.jsx'
import { ROUTES } from '../constants/routes.js'
import './PublicHeader.css'

const PublicHeader = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="public-header">
      <Link to={ROUTES.LANDING} className="public-header-logo" aria-label="Whatchu — Início">
        <Wordmark variant="nav" logoSize={28} as="span" />
      </Link>

      <nav className="public-header-actions">
        <IconButton
          icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          onClick={toggleTheme}
        />
        <Link to={ROUTES.LOGIN} className="public-header-link">Entrar</Link>
        <Link to={ROUTES.REGISTER} className="public-header-cta">Criar conta</Link>
      </nav>
    </header>
  )
}

export default PublicHeader
