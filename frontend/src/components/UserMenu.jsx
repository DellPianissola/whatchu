import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Sun, Moon, User as UserIcon, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useClickOutside } from '../hooks/useClickOutside.js'
import { useEscapeKey } from '../hooks/useEscapeKey.js'
import { ROUTES } from '../constants/routes.js'
import './UserMenu.css'

const getInitial = (name, email) => {
  const source = name?.trim() || email?.trim() || '?'
  return source.charAt(0).toUpperCase()
}

const UserMenu = () => {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useClickOutside(wrapperRef, () => setOpen(false), open)
  useEscapeKey(() => setOpen(false), open)

  const close = () => setOpen(false)

  const handleLogout = () => {
    close()
    logout()
    navigate(ROUTES.LANDING)
  }

  const handleTheme = () => {
    toggleTheme()
  }

  const handleProfile = () => {
    close()
    navigate(ROUTES.PROFILES)
  }

  const displayName = profile?.name || user?.username || 'Você'
  const email = user?.email
  const avatarUrl = profile?.avatarUrl

  return (
    <div className="ui-user-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`ui-user-menu-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="ui-user-menu-avatar">
          {avatarUrl
            ? <img src={avatarUrl} alt="" />
            : <span className="ui-user-menu-initial">{getInitial(displayName, email)}</span>
          }
        </span>
        <span className="ui-user-menu-name">{displayName}</span>
        <ChevronDown size={16} className="ui-user-menu-caret" />
      </button>

      {open && (
        <div className="ui-user-menu-panel" role="menu">
            <header className="ui-user-menu-header">
              <span className="ui-user-menu-avatar ui-user-menu-avatar--lg">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" />
                  : <span className="ui-user-menu-initial">{getInitial(displayName, email)}</span>
                }
              </span>
              <div className="ui-user-menu-identity">
                <span className="ui-user-menu-identity-name">{displayName}</span>
                {email && <span className="ui-user-menu-identity-email">{email}</span>}
              </div>
            </header>

            <div className="ui-user-menu-items">
              <button type="button" className="ui-user-menu-item" onClick={handleTheme} role="menuitem">
                <span className="ui-user-menu-item-icon">
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </span>
                <span className="ui-user-menu-item-label">
                  {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                </span>
              </button>

              <Link to={ROUTES.PROFILES} className="ui-user-menu-item" onClick={handleProfile} role="menuitem">
                <span className="ui-user-menu-item-icon"><UserIcon size={18} /></span>
                <span className="ui-user-menu-item-label">Meu perfil</span>
              </Link>
            </div>

            <div className="ui-user-menu-divider" />

            <button type="button" className="ui-user-menu-item ui-user-menu-item--danger" onClick={handleLogout} role="menuitem">
              <span className="ui-user-menu-item-icon"><LogOut size={18} /></span>
              <span className="ui-user-menu-item-label">Sair</span>
            </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
