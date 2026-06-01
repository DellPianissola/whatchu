import { Link, Navigate } from 'react-router-dom'
import { Dices, ListVideo, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import PublicHeader from '../components/PublicHeader.jsx'
import PublicDrawWidget from '../components/PublicDrawWidget.jsx'
import Wordmark from '../components/Wordmark.jsx'
import Footer from '../components/Footer.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { ROUTES } from '../constants/routes.js'
import './Landing.css'

const FEATURES = [
  {
    Icon: Dices,
    title: 'Sorteio inteligente',
    text: 'Não sabe o que assistir? Deixa a sorte decidir entre filmes e séries, com filtros de gênero e streaming.',
  },
  {
    Icon: ListVideo,
    title: 'Sua watchlist organizada',
    text: 'Monte listas de filmes e séries por perfil, marque o que já assistiu e defina prioridades.',
  },
  {
    Icon: Users,
    title: 'Decida em grupo',
    text: 'Sorteie o próximo título junto com os amigos e acabe com a indecisão coletiva.',
    soon: true,
  },
]

const FAQ = [
  {
    q: 'Preciso criar conta para sortear?',
    a: 'Não. O sorteio "Estou com sorte" é aberto — escolha os filtros e descubra um título na hora. A conta serve para montar e salvar suas listas.',
  },
  {
    q: 'O Whatchu é gratuito?',
    a: 'Sim. Você pode criar sua conta, montar suas listas e sortear sem custo.',
  },
  {
    q: 'De onde vêm os filmes e séries?',
    a: 'Os dados de catálogo, sinopses e pôsteres vêm do TMDB (The Movie Database).',
  },
]

const Landing = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to={ROUTES.HOME} replace />

  return (
    <div className="landing">
      <PublicHeader />

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-hero-brand">
              <Wordmark variant="hero" logoSize={64} subtitle="O que vamos assistir hoje?" as="span" />
            </div>
            <h1 className="landing-headline">
              Pare de perder tempo decidindo o que assistir
            </h1>
            <p className="landing-subhead">
              O Whatchu sorteia o próximo filme ou série pra você. Monte sua watchlist,
              filtre por gênero e streaming, e deixe a sorte resolver a indecisão.
            </p>
            <div className="landing-hero-ctas">
              <Link to={ROUTES.REGISTER} className="landing-cta-primary">Criar conta grátis</Link>
              <Link to={ROUTES.LOGIN} className="landing-cta-secondary">Já tenho conta</Link>
            </div>
          </div>

          <div className="landing-hero-widget">
            <div className="landing-widget-card">
              <PublicDrawWidget />
            </div>
          </div>
        </section>

        <section className="landing-features">
          <h2 className="landing-section-title">Como o Whatchu ajuda</h2>
          <div className="landing-features-grid">
            {FEATURES.map(({ Icon, title, text, soon }) => (
              <article key={title} className="landing-feature">
                <span className="landing-feature-icon"><Icon size={24} /></span>
                <h3 className="landing-feature-title">
                  {title}
                  {soon && <span className="landing-feature-badge">Em breve</span>}
                </h3>
                <p className="landing-feature-text">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-faq">
          <h2 className="landing-section-title">Perguntas frequentes</h2>
          <div className="landing-faq-list">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="landing-faq-item">
                <summary className="landing-faq-q">{q}</summary>
                <p className="landing-faq-a">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="landing-final-cta">
          <Link to={ROUTES.REGISTER} className="landing-cta-primary">Criar minha conta grátis</Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
