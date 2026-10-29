import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll.js'
import PublicHeader from '../components/PublicHeader.jsx'
import PublicDrawWidget from '../components/PublicDrawWidget.jsx'
import Wordmark from '../components/Wordmark.jsx'
import Footer from '../components/Footer.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import GroupShowcase from './landing/GroupShowcase.jsx'
import ItinerarySlip from './landing/ItinerarySlip.jsx'
import FeatureSheets from './landing/FeatureSheets.jsx'
import FaqExplorer from './landing/FaqExplorer.jsx'
import Poster from './landing/Poster.jsx'
import { FOLDERS, POSTER_DECK, SECTIONS, SECTION_LABELS, SHORTCUTS } from './landing/content.js'
import { ROUTES } from '../constants/routes.js'
import './Landing.css'

const Landing = () => {
  const { isAuthenticated, loading } = useAuth()
  const revealRef = useRevealOnScroll()

  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to={ROUTES.HOME} replace />

  return (
    <div className="landing" ref={revealRef}>
      <PublicHeader />

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero-copy">
            <h1 id="hero-title" className="landing-headline">O que vamos assistir hoje?</h1>
            <p className="landing-subhead">
              O Whatchu sorteia o próximo filme ou série: da sua lista, ou da lista de todo mundo junto.
            </p>
          </div>

          <nav className="landing-folders" aria-label="Seções">
            {FOLDERS.map(({ id, label }, index) => (
              <a key={id} href={`#${id}`} className={`landing-folder landing-folder--${id}`} style={{ '--n': index }}>
                <span className="landing-folder-tab">{label}</span>
              </a>
            ))}
          </nav>

          <div id={SECTIONS.DRAW} className="landing-folder landing-folder--front">
            <span className="landing-folder-tab">{SECTION_LABELS[SECTIONS.DRAW]}</span>
            <div className="landing-front">
              <PublicDrawWidget
                layout="split"
                intro={(
                  <p className="landing-front-note">
                    Sem conta. Escolha filme ou série, filtre se quiser e aperte sortear.
                  </p>
                )}
              />
            </div>
          </div>
        </section>

        <GroupShowcase />
        <ItinerarySlip />
        <FeatureSheets />

        <FaqExplorer />

        <section className="landing-choice landing-panel" aria-labelledby="choice-title">
          <div className="landing-choice-copy">
            <h2 id="choice-title" className="landing-choice-question" data-reveal>Sozinho ou em grupo?</h2>
            <p className="landing-choice-note" data-reveal style={{ '--i': 1 }}>
              Sortear não pede cadastro. A conta guarda suas listas e traz os amigos.
            </p>
            <div className="landing-choice-row" data-reveal style={{ '--i': 2 }}>
              <a href={`#${SECTIONS.DRAW}`} className="landing-btn landing-btn--paper">Sortear agora</a>
              <Link to={ROUTES.REGISTER} className="landing-btn">Criar conta grátis</Link>
            </div>
          </div>
          <ul className="landing-deck" aria-label="Alguns títulos do catálogo" data-reveal style={{ '--i': 1 }}>
            {POSTER_DECK.map(({ title, src }, index) => (
              <li key={title} className="landing-deck-card" style={{ '--k': index - (POSTER_DECK.length - 1) / 2 }}>
                <Poster src={src} title={title} />
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-board" aria-labelledby="board-title">
          <div className="landing-tile landing-tile--brand">
            <Wordmark variant="hero" logoSize={96} as="span" />
            <h2 id="board-title" className="landing-tile-statement">Menos tempo escolhendo, mais tempo assistindo.</h2>
          </div>
          <nav className="landing-tile landing-tile--nav" aria-label="Atalhos">
            <ul>
              {SHORTCUTS.map(({ id, label }) => (
                <li key={id}><a href={`#${id}`}>{label}</a></li>
              ))}
            </ul>
            <p className="landing-tile-login">
              Já tem conta? <Link to={ROUTES.LOGIN} className="landing-btn landing-btn--small">Entrar</Link>
            </p>
          </nav>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
