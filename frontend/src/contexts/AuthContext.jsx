import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api.js'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('accessToken'))

  const logout = () => {
    setUser(null)
    setProfile(null)
    setToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    delete api.defaults.headers.common['Authorization']
  }

  useEffect(() => {
    if (token) {
      localStorage.setItem('accessToken', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      localStorage.removeItem('accessToken')
      delete api.defaults.headers.common['Authorization']
    }
  }, [token])

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('accessToken')
      if (storedToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
        try {
          const response = await api.get('/auth/me')
          setUser(response.data.user)
          setProfile(response.data.user?.profile || null)
        } catch {
          // interceptor já tenta refresh; se chegar aqui, ambos falharam
          setUser(null)
          setProfile(null)
          setToken(null)
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
      setToken(accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao fazer login',
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
        error: error.response?.data?.error || 'Erro ao registrar',
      }
    }
  }

  const verifyEmailAndLogin = async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token })
      const { user, profile, accessToken, refreshToken } = response.data
      setUser(user)
      setProfile(profile)
      setToken(accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Não foi possível verificar o email',
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
