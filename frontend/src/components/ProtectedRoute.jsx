import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import Footer from './Footer.jsx'
import LoadingScreen from './LoadingScreen.jsx'
import { ROUTES } from '../constants/routes.js'

const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { isAuthenticated, loading, profile } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // Onboarding pendente → força o usuário pra rota /onboarding.
  // A própria rota /onboarding usa requireOnboarding={false} pra não loopar.
  if (requireOnboarding && profile && !profile.onboardedAt) {
    return <Navigate to={ROUTES.ONBOARDING} replace />
  }

  return (
    <div className="protected-shell">
      <div className="protected-content">{children}</div>
      <Footer />
    </div>
  )
}

export default ProtectedRoute
