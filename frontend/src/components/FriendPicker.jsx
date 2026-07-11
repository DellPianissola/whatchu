import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Settings, Search, Check } from 'lucide-react'
import { getFriends, previewDraw, apiErrorMessage } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import Modal from './Modal.jsx'
import Avatar from './Avatar.jsx'
import Spinner from './Spinner.jsx'
import EmptyState from './EmptyState.jsx'
import { ROUTES } from '../constants/routes.js'
import { pluralize } from '../utils/content.js'
import './FriendPicker.css'

const SEARCH_MIN_FRIENDS = 6
const POT_PREVIEW_DEBOUNCE_MS = 350

const FriendPicker = ({ open, onClose, selected, onConfirm, recentIds = [] }) => {
  const { profile } = useAuth()
  const { toast } = useNotify()
  const [friends, setFriends] = useState(null)
  const [pending, setPending] = useState([])
  const [query, setQuery] = useState('')
  const [pot, setPot] = useState(null)

  useEffect(() => {
    if (!open) return
    setPending(selected.map((f) => f.id))
    setQuery('')
    let cancelled = false
    getFriends()
      .then((data) => {
        if (cancelled) return
        // Ordena uma vez só (selecionados → recentes → alfabético) pra grade
        // não reordenar a cada clique.
        const selectedIds = new Set(selected.map((f) => f.id))
        const recentRank = new Map(recentIds.map((id, i) => [id, i]))
        setFriends([...data.friends].sort((a, b) => {
          const aSel = selectedIds.has(a.profile.id)
          const bSel = selectedIds.has(b.profile.id)
          if (aSel !== bSel) return aSel ? -1 : 1
          const aRec = recentRank.get(a.profile.id) ?? Infinity
          const bRec = recentRank.get(b.profile.id) ?? Infinity
          if (aRec !== bRec) return aRec - bRec
          return a.profile.name.localeCompare(b.profile.name)
        }))
      })
      .catch((err) => {
        if (cancelled) return
        toast.error(apiErrorMessage(err, 'Erro ao carregar amigos'))
        onClose()
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || friends === null) return
    let cancelled = false
    setPot(null)
    const timer = setTimeout(() => {
      previewDraw({ friendIds: pending })
        .then((result) => { if (!cancelled) setPot(result) })
        .catch(() => {})
    }, POT_PREVIEW_DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [open, friends, pending])

  const toggle = (profileId) =>
    setPending((prev) => prev.includes(profileId)
      ? prev.filter((id) => id !== profileId)
      : [...prev, profileId])

  const confirm = () => {
    onConfirm(friends
      .filter((f) => pending.includes(f.profile.id))
      .map((f) => f.profile))
    onClose()
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visible = friends && normalizedQuery
    ? friends.filter((f) =>
        f.profile.name.toLowerCase().includes(normalizedQuery) ||
        f.profile.username.toLowerCase().includes(normalizedQuery))
    : friends
  const sessionFriends = friends
    ? pending
        .map((id) => friends.find((f) => f.profile.id === id))
        .filter(Boolean)
    : []

  return (
    <Modal open={open} onClose={onClose} title="Sortear com amigos" labelledBy="friend-picker-title">
      {friends === null ? (
        <div className="friend-picker-loading"><Spinner /></div>
      ) : friends.length === 0 ? (
        <EmptyState
          icon={<Users size={36} />}
          title="Nenhum amigo ainda"
          description="Adicione amigos pra sortear levando em conta as listas de todo mundo."
          action={
            <Link to={ROUTES.FRIENDS} className="friend-picker-btn">Adicionar amigos</Link>
          }
        />
      ) : (
        <>
          <div className="friend-picker-session">
            <span className="friend-picker-session-label">Quem entra no sorteio</span>
            <div className="friend-picker-session-avatars">
              <span className="friend-picker-session-avatar" title="Você">
                <Avatar src={profile?.avatarUrl} name={profile?.name} size={40} />
              </span>
              {sessionFriends.map((f) => (
                <button
                  key={f.profile.id}
                  className="friend-picker-session-avatar friend-picker-session-avatar--removable"
                  onClick={() => toggle(f.profile.id)}
                  title={`Remover ${f.profile.name}`}
                  aria-label={`Remover ${f.profile.name} do sorteio`}
                >
                  <Avatar src={f.profile.avatarUrl} name={f.profile.name} size={40} />
                </button>
              ))}
              {sessionFriends.length === 0 && (
                <span className="friend-picker-session-hint">
                  sozinho por enquanto — toque nos amigos pra chamar
                </span>
              )}
            </div>
            <p className="friend-picker-pot" aria-live="polite">
              {pot === null ? (
                'calculando o pote…'
              ) : (
                <>
                  ≈ {pot.total} {pluralize(pot.total, 'título', 'títulos')} no pote
                  {pot.common > 0 && (
                    <> · <strong>{pot.common} em comum ⚡</strong></>
                  )}
                </>
              )}
            </p>
          </div>

          {friends.length >= SEARCH_MIN_FRIENDS && (
            <div className="friend-picker-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar amigo"
                aria-label="Buscar amigo"
              />
            </div>
          )}

          {friends.length > 1 && (
            <div className="friend-picker-bulk">
              <button
                className="friend-picker-bulk-btn"
                onClick={() => setPending((prev) =>
                  [...new Set([...prev, ...visible.map((f) => f.profile.id)])])}
                disabled={visible.length === 0}
              >
                {normalizedQuery ? 'Todos da busca' : 'Todos'}
              </button>
              <button
                className="friend-picker-bulk-btn"
                onClick={() => setPending([])}
                disabled={pending.length === 0}
              >
                Limpar
              </button>
            </div>
          )}

          {visible.length === 0 ? (
            <p className="friend-picker-no-results">Nenhum amigo com esse nome.</p>
          ) : (
            <ul className="friend-picker-grid">
              {visible.map((f) => {
                const isSelected = pending.includes(f.profile.id)
                return (
                  <li key={f.id}>
                    <button
                      className={`friend-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => toggle(f.profile.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="friend-card-avatar">
                        <Avatar src={f.profile.avatarUrl} name={f.profile.name} size={56} />
                        {isSelected && (
                          <span className="friend-card-check" aria-hidden="true">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="friend-card-name">{f.profile.name.split(' ')[0]}</span>
                      <span className="friend-card-count">
                        {f.profile.movieCount} {pluralize(f.profile.movieCount, 'item', 'itens')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="friend-picker-footer">
            <Link to={ROUTES.FRIENDS} className="friend-picker-manage">
              <Settings size={14} /> Gerenciar amigos
            </Link>
            <button className="friend-picker-btn" onClick={confirm}>
              {pending.length > 0 ? 'Aplicar' : 'Sortear sozinho'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

export default FriendPicker
