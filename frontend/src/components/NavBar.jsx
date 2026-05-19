import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useTheme } from '../hooks/useTheme.js'
import Wordmark from './Wordmark.jsx'
import { ROUTES } from '../constants/routes.js'
import './NavBar.css'

const NavBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  if (!isAuthenticated) {
    return null
  }

  // onboarding: sem navbar — usuário não deve sair do fluxo
  if (location.pathname === ROUTES.ONBOARDING) {
    return null
  }

  const themeTitle = theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'

  return (
    <nav className="navbar">
      <Link to={ROUTES.HOME} className="nav-logo">
        <Wordmark variant="nav" logoSize={32} as="span" />
      </Link>
      <div className="nav-links">
        <Link to={ROUTES.HOME} className={isActive(ROUTES.HOME) ? 'active' : ''}>
          🏠 Início
        </Link>
        <Link to={ROUTES.SEARCH} className={isActive(ROUTES.SEARCH) ? 'active' : ''}>
          🔍 Buscar
        </Link>
        <Link to={ROUTES.LIST} className={isActive(ROUTES.LIST) ? 'active' : ''}>
          📋 Minha Lista
        </Link>
        <div className="nav-user">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-theme-toggle"
            title={themeTitle}
            aria-label={themeTitle}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to={ROUTES.PROFILES} className="nav-username-link">
            {user?.username}
          </Link>
          <button onClick={handleLogout} className="btn-logout">
            Sair
          </button>
        </div>
      </div>
    </nav>
  )
}

export default NavBar

