import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getPendingInvitesCount } from '../services/api.js'
import { useAuth } from './AuthContext.jsx'

const FriendInvitesContext = createContext(null)

export const FriendInvitesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      setPendingCount(await getPendingInvitesCount())
    } catch { /* badge é best-effort — falha não pode derrubar a navegação */ }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setPendingCount(0)
      return
    }
    refresh()
    // Foco na aba cobre o "quase tempo real" sem websocket/polling.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAuthenticated, refresh])

  return (
    <FriendInvitesContext.Provider value={{ pendingCount, refresh }}>
      {children}
    </FriendInvitesContext.Provider>
  )
}

export const useFriendInvites = () => {
  const ctx = useContext(FriendInvitesContext)
  if (!ctx) {
    throw new Error('useFriendInvites deve ser usado dentro de <FriendInvitesProvider>')
  }
  return ctx
}
