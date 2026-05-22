import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { NotificationProvider } from './contexts/NotificationContext.jsx'
import { UserMoviesProvider } from './contexts/UserMoviesContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Search from './pages/Search'
import MyList from './pages/MyList'
import Profiles from './pages/Profiles'
import Onboarding from './pages/Onboarding'
import VerifyEmail from './pages/VerifyEmail'
import VerifyEmailChange from './pages/VerifyEmailChange'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NavBar from './components/NavBar.jsx'
import CookieBanner from './components/CookieBanner.jsx'
import { initAnalytics, trackPageView } from './services/analytics.js'
import { ROUTES } from './constants/routes.js'
import './App.css'

initAnalytics()

const PageViewTracker = () => {
  const location = useLocation()
  useEffect(() => { trackPageView(location.pathname) }, [location.pathname])
  return null
}

const protect = (element, opts = {}) => (
  <ProtectedRoute {...opts}>{element}</ProtectedRoute>
)

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <UserMoviesProvider>
          <Router>
            <PageViewTracker />
            <NavBar />
            <CookieBanner />
            <Routes>
              <Route path={ROUTES.LOGIN}           element={<Login />} />
              <Route path={ROUTES.REGISTER}        element={<Register />} />
              <Route path={ROUTES.VERIFY_EMAIL}        element={<VerifyEmail />} />
              <Route path={ROUTES.VERIFY_EMAIL_CHANGE} element={<VerifyEmailChange />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
              <Route path={ROUTES.RESET_PASSWORD}  element={<ResetPassword />} />
              <Route path={ROUTES.HOME}            element={protect(<Home />)} />
              <Route path={ROUTES.SEARCH}          element={protect(<Search />)} />
              <Route path={ROUTES.LIST}            element={protect(<MyList />)} />
              <Route path={ROUTES.PROFILES}        element={protect(<Profiles />)} />
              <Route path={ROUTES.ONBOARDING}      element={protect(<Onboarding />, { requireOnboarding: false })} />
              <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Routes>
          </Router>
        </UserMoviesProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App
