import { useEffect, useRef, useState } from 'react'
import WatchuLogo from '../../components/WatchuLogo.jsx'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'
import { REDUCED_MOTION_QUERY } from '../../constants/ui.js'
import { FAQ_GROUPS, SECTIONS } from './content.js'
import './FaqExplorer.css'

const FAQ_ITEMS = FAQ_GROUPS.flatMap(({ items }) => items)
const TYPING_MS = 550
const CHAT_ID = 'faq-chat'

// `<` escapado: o JSON vai cru dentro de <script> e não pode fechar a tag.
const FAQ_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}).replace(/</g, '\\u003c')

const FaqExplorer = () => {
  const [activeQ, setActiveQ] = useState(FAQ_ITEMS[0].q)
  const [typing, setTyping] = useState(false)
  const typingTimer = useRef(null)
  const chatRef = useRef(null)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const active = FAQ_ITEMS.find(({ q }) => q === activeQ)

  useEffect(() => () => clearTimeout(typingTimer.current), [])

  const ask = (q) => {
    if (q === activeQ) return
    setActiveQ(q)
    chatRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
    clearTimeout(typingTimer.current)
    if (reducedMotion) return
    setTyping(true)
    typingTimer.current = setTimeout(() => setTyping(false), TYPING_MS)
  }

  return (
    <section id={SECTIONS.FAQ} className="faq landing-panel" aria-labelledby="faq-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }} />

      <div className="faq-asks">
        <h2 id="faq-title" className="landing-h2" data-reveal>Dúvidas</h2>
        <p className="faq-lead" data-reveal style={{ '--i': 1 }}>Escolha uma pergunta.</p>

        {FAQ_GROUPS.map(({ topic, items }, groupIndex) => (
          <div key={topic} className="faq-group" data-reveal style={{ '--i': groupIndex + 2 }}>
            <h3 className="faq-topic">{topic}</h3>
            <ul className="faq-chips">
              {items.map(({ q }) => (
                <li key={q}>
                  <button
                    type="button"
                    className="faq-chip"
                    aria-pressed={q === activeQ}
                    aria-controls={CHAT_ID}
                    onClick={() => ask(q)}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div id={CHAT_ID} ref={chatRef} className="faq-chat" aria-live="polite" data-reveal style={{ '--i': 2 }}>
        <p key={`q-${active.q}`} className="faq-bubble faq-bubble--you">{active.q}</p>
        <div className="faq-reply">
          <span className="faq-avatar" aria-hidden="true"><WatchuLogo size={22} /></span>
          {typing ? (
            <span className="faq-bubble faq-bubble--typing">
              <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
              <span className="visually-hidden">Digitando</span>
            </span>
          ) : (
            <p key={`a-${active.q}`} className="faq-bubble faq-bubble--us">{active.a}</p>
          )}
        </div>
        <a href={`#${SECTIONS.DRAW}`} className="landing-btn landing-btn--small faq-chat-cta">Sortear sem conta</a>
      </div>
    </section>
  )
}

export default FaqExplorer
