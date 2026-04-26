import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import './NavBar.css'

const NavBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Não mostra navbar nas páginas de login/register
  if (!isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    return null
  }

  // Se não estiver autenticado, redireciona para login
  if (!isAuthenticated) {
    return null
  }

  // Não mostra navbar no onboarding (usuário não deve navegar pra fora)
  if (location.pathname === '/onboarding') {
    return null
  }

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        🎬 What Watch Next
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
          <Link to="/profiles" className="nav-username-link">
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

