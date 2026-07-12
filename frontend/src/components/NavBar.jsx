import { Link, NavLink, useLocation } from 'react-router-dom'
import { Home, Search, ListVideo, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useFriendInvites } from '../contexts/FriendInvitesContext.jsx'
import Wordmark from './Wordmark.jsx'
import UserMenu from './UserMenu.jsx'
import NavBadge from './NavBadge.jsx'
import { ROUTES } from '../constants/routes.js'
import './NavBar.css'

const NAV_LINKS = [
  { to: ROUTES.HOME,   label: 'Início', Icon: Home,      end: true },
  { to: ROUTES.SEARCH, label: 'Buscar', Icon: Search },
  { to: ROUTES.LIST,   label: 'Minha Lista', Icon: ListVideo },
  { to: ROUTES.FRIENDS, label: 'Amigos', Icon: Users, showInviteBadge: true },
]

const NavBar = () => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { pendingCount } = useFriendInvites()

  if (!isAuthenticated) return null
  if (location.pathname === ROUTES.ONBOARDING) return null

  return (
    <nav className="navbar">
      <Link to={ROUTES.HOME} className="nav-logo" aria-label="Whatchu — Início">
        <Wordmark variant="nav" logoSize={28} as="span" />
      </Link>

      <div className="nav-links">
        {NAV_LINKS.map(({ to, label, Icon, end, showInviteBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
          >
            {showInviteBadge ? (
              <NavBadge count={pendingCount}><Icon size={18} /></NavBadge>
            ) : (
              <Icon size={18} />
            )}
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="nav-user">
        <UserMenu />
      </div>
    </nav>
  )
}

export default NavBar
