import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import PublicHeader from '../components/PublicHeader.jsx'
import PublicDrawWidget from '../components/PublicDrawWidget.jsx'
import Footer from '../components/Footer.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { ROUTES } from '../constants/routes.js'
import './Draw.css'

const Draw = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to={ROUTES.HOME} replace />

  return (
    <div className="draw-page">
      <PublicHeader />

      <main className="draw-page-main">
        <header className="draw-page-header">
          <h1 className="draw-page-title">Sortear o que assistir</h1>
          <p className="draw-page-subhead">
            Escolha entre filmes e séries, filtre por gênero e streaming, e deixe a sorte decidir.
          </p>
        </header>

        <PublicDrawWidget />

        <p className="draw-page-cta">
          Quer salvar suas próprias listas e sortear só o que você quer ver?{' '}
          <Link to={ROUTES.REGISTER} className="draw-page-cta-link">Crie sua conta grátis</Link>.
        </p>
      </main>

      <Footer />
    </div>
  )
}

export default Draw
