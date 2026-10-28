import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { AuthContext } from './contexts/AuthContext.jsx'
import { NotificationProvider } from './contexts/NotificationContext.jsx'
import Landing from './pages/Landing.jsx'
import { ROUTES } from './constants/routes.js'

const GUEST = { loading: false, isAuthenticated: false }

export const renderLanding = () => renderToString(
  <AuthContext.Provider value={GUEST}>
    <NotificationProvider>
      <StaticRouter location={ROUTES.LANDING}>
        <Landing />
      </StaticRouter>
    </NotificationProvider>
  </AuthContext.Provider>
)
