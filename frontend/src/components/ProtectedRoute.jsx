import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { isAuthenticated, loading, profile } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--text)'
      }}>
        Carregando...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Onboarding pendente → força o usuário pra rota /onboarding.
  // A própria rota /onboarding usa requireOnboarding={false} pra não loopar.
  if (requireOnboarding && profile && !profile.onboardedAt) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

export default ProtectedRoute
