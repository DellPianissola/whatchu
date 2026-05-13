import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useTheme } from '../hooks/useTheme.js'
import WatchuLogo from './WatchuLogo.jsx'
import './NavBar.css'

const NavBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!isAuthenticated) {
    return null
  }

  // onboarding: sem navbar — usuário não deve sair do fluxo
  if (location.pathname === '/onboarding') {
    return null
  }

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        <WatchuLogo size={32} />
        <span className="nav-brand-text">What<span className="nav-brand-chu">chu</span></span>
      </Link>
      <div className="nav-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}>
          🏠 Início
        </Link>
        <Link to="/search" className={isActive('/search') ? 'active' : ''}>
          🔍 Buscar
        </Link>
        <Link to="/list" className={isActive('/list') ? 'active' : ''}>
          📋 Minha Lista
        </Link>
        <div className="nav-user">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-theme-toggle"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link
            to="/profiles"
            className="nav-username-link"
            title={user && !user.emailVerified ? 'Email ainda não verificado — clique para resolver' : undefined}
          >
            {user?.username}
            {user && !user.emailVerified && (
              <span className="nav-alert-dot" aria-label="Email não verificado" />
            )}
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

