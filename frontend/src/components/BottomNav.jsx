import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, ListVideo, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useFriendInvites } from '../contexts/FriendInvitesContext.jsx'
import NavBadge from './NavBadge.jsx'
import { ROUTES } from '../constants/routes.js'
import './BottomNav.css'

const TABS = [
  { to: ROUTES.HOME,   label: 'Início', Icon: Home },
  { to: ROUTES.SEARCH, label: 'Buscar', Icon: Search },
  { to: ROUTES.LIST,   label: 'Lista',  Icon: ListVideo },
  { to: ROUTES.FRIENDS, label: 'Amigos', Icon: Users, showInviteBadge: true },
]

const HIDDEN_ROUTES = new Set([
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.VERIFY_EMAIL,
  ROUTES.VERIFY_EMAIL_CHANGE,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.ONBOARDING,
])

const BottomNav = () => {
  const { isAuthenticated } = useAuth()
  const { pendingCount } = useFriendInvites()
  const location = useLocation()

  if (!isAuthenticated) return null
  if (HIDDEN_ROUTES.has(location.pathname)) return null

  return (
    <nav className="ui-bottom-nav" aria-label="Navegação principal">
      {TABS.map(({ to, label, Icon, showInviteBadge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === ROUTES.HOME}
          className={({ isActive }) =>
            `ui-bottom-nav-item ${isActive ? 'ui-bottom-nav-item--active' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <span className="ui-bottom-nav-icon">
                {showInviteBadge ? (
                  <NavBadge count={pendingCount}>
                    <Icon size={22} fill={isActive ? 'currentColor' : 'none'} strokeWidth={isActive ? 1.5 : 2} />
                  </NavBadge>
                ) : (
                  <Icon size={22} fill={isActive ? 'currentColor' : 'none'} strokeWidth={isActive ? 1.5 : 2} />
                )}
              </span>
              <span className="ui-bottom-nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
