import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../../components/Avatar.jsx'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'
import { ROUTES } from '../../constants/routes.js'
import { REDUCED_MOTION_QUERY } from '../../constants/ui.js'
import Poster from './Poster.jsx'
import { GROUP_MODES, POSTERS, SECTIONS } from './content.js'
import './GroupShowcase.css'

const SHUFFLE_POOL = Object.values(POSTERS)
const SHUFFLE_FRAMES = 7
const SHUFFLE_FRAME_MS = 70

const preloadPosters = () => SHUFFLE_POOL.forEach((src) => { new Image().src = src })

const DrawTicket = ({ mode, active, shufflePoster }) => (
  <figure className={`group-ticket${active ? ' is-active' : ''}`} aria-hidden={!active}>
    <span className="group-ticket-frame">
      <Poster
        className={`group-ticket-poster${shufflePoster ? ' is-shuffling' : ''}`}
        src={shufflePoster ?? mode.drawn.poster}
        title={mode.drawn.title}
      />
    </span>
    <figcaption className="group-ticket-stub">
      <span className="group-ticket-kind">{mode.drawn.type} · {mode.drawn.year}</span>
      <strong className="group-ticket-title">{mode.drawn.title}</strong>
      <span className="group-ticket-from">Saiu da lista de</span>
      <span className="group-ticket-sources">
        {mode.sources.map((name) => (
          <span key={name} className="group-ticket-source">
            <Avatar name={name} size={32} />
            {name}
          </span>
        ))}
      </span>
      <span className="group-ticket-verdict">{mode.verdict}</span>
    </figcaption>
  </figure>
)

const GroupShowcase = () => {
  const [activeKey, setActiveKey] = useState(GROUP_MODES[1].key)
  const [shufflePoster, setShufflePoster] = useState(null)
  const shuffleTimer = useRef(null)
  const sectionRef = useRef(null)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  useEffect(() => () => clearInterval(shuffleTimer.current), [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || reducedMotion || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      preloadPosters()
      observer.disconnect()
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [reducedMotion])

  const selectMode = (key) => {
    if (key === activeKey) return
    setActiveKey(key)
    clearInterval(shuffleTimer.current)
    setShufflePoster(null)
    if (reducedMotion) return

    let frame = 0
    shuffleTimer.current = setInterval(() => {
      frame += 1
      if (frame > SHUFFLE_FRAMES) {
        clearInterval(shuffleTimer.current)
        setShufflePoster(null)
        return
      }
      setShufflePoster(SHUFFLE_POOL[frame % SHUFFLE_POOL.length])
    }, SHUFFLE_FRAME_MS)
  }

  return (
    <section ref={sectionRef} id={SECTIONS.GROUP} className="group-showcase landing-panel" aria-labelledby="group-title">
      <div className="group-plate" aria-live="polite" data-reveal>
        {GROUP_MODES.map((mode) => {
          const active = mode.key === activeKey
          return (
            <DrawTicket
              key={active ? `${mode.key}-active` : mode.key}
              mode={mode}
              active={active}
              shufflePoster={active ? shufflePoster : null}
            />
          )
        })}
      </div>

      <div className="group-copy">
        <div>
          <h2 id="group-title" className="landing-h2" data-reveal>Junta a lista de todo mundo</h2>
          <p className="group-lead" data-reveal style={{ '--i': 1 }}>
            Cada um monta a sua. Na hora de escolher, você chama quem quiser e o Whatchu sorteia
            entre todas, sem repetir título.
          </p>
        </div>

        <ul className="group-modes" data-reveal style={{ '--i': 2 }}>
          {GROUP_MODES.map((mode) => (
            <li key={mode.key}>
              <button
                type="button"
                className="group-mode"
                aria-pressed={mode.key === activeKey}
                onClick={() => selectMode(mode.key)}
                onMouseEnter={() => selectMode(mode.key)}
                onFocus={() => selectMode(mode.key)}
              >
                <span className="group-mode-label">{mode.label}</span>
                <span className="group-mode-note">{mode.note}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="group-actions" data-reveal style={{ '--i': 3 }}>
          <Link to={ROUTES.REGISTER} className="landing-btn landing-btn--ink">Criar conta e chamar amigos</Link>
          <a href={`#${SECTIONS.HOW}`} className="landing-btn landing-btn--soft">Ver como funciona</a>
        </div>
      </div>
    </section>
  )
}

export default GroupShowcase
