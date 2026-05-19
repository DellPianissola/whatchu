import { createContext, useContext, useState, useEffect, useRef } from 'react'
import api, { apiErrorMessage } from '../services/api.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
}

const clearStoredTokens = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = () => {
    setUser(null)
    setProfile(null)
    clearStoredTokens()
  }

  // Guard contra double-invoke do useEffect em React StrictMode (dev).
  const checkAuthAttempted = useRef(false)

  useEffect(() => {
    if (checkAuthAttempted.current) return
    checkAuthAttempted.current = true

    const checkAuth = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      if (storedToken) {
        try {
          const response = await api.get('/auth/me')
          setUser(response.data.user)
          setProfile(response.data.user?.profile || null)
        } catch {
          // interceptor já tenta refresh; se chegar aqui, ambos falharam
          setUser(null)
          setProfile(null)
          clearStoredTokens()
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const login = async (identifier, password) => {
    try {
      const response = await api.post('/auth/login', { identifier, password })
      const { user, profile, accessToken, refreshToken } = response.data
      setUser(user)
      setProfile(profile)
      setTokens(accessToken, refreshToken)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: apiErrorMessage(error, 'Erro ao fazer login'),
      }
    }
  }

  // Registro não loga — só cria Pending. Login acontece em verifyEmailAndLogin().
  const register = async (email, username, password, birthDate) => {
    try {
      await api.post('/auth/register', { email, username, password, birthDate: birthDate || null })
      return { success: true, pending: true }
    } catch (error) {
      return {
        success: false,
        error: apiErrorMessage(error, 'Erro ao registrar'),
      }
    }
  }

  const verifyEmailAndLogin = async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token })
      const { user, profile, accessToken, refreshToken } = response.data
      setUser(user)
      setProfile(profile)
      setTokens(accessToken, refreshToken)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: apiErrorMessage(error, 'Não foi possível verificar o email'),
        code:  error.response?.data?.code,
      }
    }
  }

  const updateProfile = (newProfile) => {
    setProfile(newProfile)
  }

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
      setProfile(response.data.user?.profile || null)
    } catch {
      // silencioso — mantém estado atual
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        verifyEmailAndLogin,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
