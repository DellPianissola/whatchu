import { Check } from 'lucide-react'
import Poster from './Poster.jsx'
import { FILTER_SAMPLE, PRIORITY_SAMPLE, PROGRESS_SAMPLE, SECTIONS } from './content.js'
import './FeatureSheets.css'

const PriorityFragment = () => (
  <ul className="sheet-ui sheet-priority">
    {PRIORITY_SAMPLE.map(({ title, meta, priority, poster }) => (
      <li key={title} className="sheet-priority-row">
        <Poster className="sheet-poster" src={poster} title={title} />
        <span className="sheet-priority-text">
          <strong>{title}</strong>
          <span>{meta}</span>
        </span>
        <span className="sheet-priority-tag" data-priority={priority}>{priority}</span>
      </li>
    ))}
  </ul>
)

const ProgressFragment = () => {
  const { title, poster, season, episode, seasons } = PROGRESS_SAMPLE
  const watched = seasons.reduce((sum, s) => sum + s.watched, 0)
  const total = seasons.reduce((sum, s) => sum + s.total, 0)
  const percent = Math.round((watched / total) * 100)

  return (
    <div className="sheet-ui sheet-progress">
      <Poster className="sheet-poster" src={poster} title={title} type="series" />
      <div className="sheet-progress-body">
        <strong className="sheet-progress-title">{title}</strong>
        <span className="sheet-progress-pointer">Parei no T{season} E{episode}</span>
        <span className="sheet-progress-bar" style={{ '--p': `${percent}%` }} aria-hidden="true" />
        <span className="sheet-progress-count">{watched} de {total} episódios · {percent}%</span>
        <ul className="sheet-progress-seasons">
          {seasons.map((s) => (
            <li key={s.label}>
              <span>{s.label}</span>
              <span>{s.watched}/{s.total}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const FilterFragment = () => (
  <div className="sheet-ui sheet-filter">
    <ul className="sheet-filter-chips">
      {FILTER_SAMPLE.chips.map((chip) => (
        <li key={chip}><Check size={16} aria-hidden="true" />{chip}</li>
      ))}
    </ul>
    <div className="sheet-filter-result">
      <Poster className="sheet-poster" src={FILTER_SAMPLE.drawn.poster} title={FILTER_SAMPLE.drawn.title} />
      <span>
        <strong>{FILTER_SAMPLE.drawn.title}</strong>
        <span>{FILTER_SAMPLE.drawn.meta}</span>
      </span>
    </div>
  </div>
)

const SHEETS = [
  {
    key: 'priority',
    title: 'O que é urgente',
    text: 'Baixa, média, alta ou urgente. Quanto mais urgente, mais chance de sair no sorteio.',
    Fragment: PriorityFragment,
  },
  {
    key: 'progress',
    title: 'Onde você parou',
    text: 'Em série, você marca o episódio. Quer reassistir? Volta o ponteiro e a data em que terminou continua guardada.',
    Fragment: ProgressFragment,
  },
  {
    key: 'filters',
    title: 'Só o que dá pra ver',
    text: 'Filtre o sorteio pelos streamings que você assina e por gênero. Anime tem filtro próprio.',
    Fragment: FilterFragment,
  },
]

const FeatureSheets = () => (
  <section id={SECTIONS.LIST} className="sheets" aria-labelledby="list-title">
    <h2 id="list-title" className="landing-h2 sheets-title" data-reveal>Sua lista, do seu jeito</h2>
    <div className="sheets-stack">
      {SHEETS.map(({ key, title, text, Fragment }, index) => (
        <article key={key} className={`sheet sheet--${key}`} style={{ '--n': index }}>
          <h3 className="sheet-title">{title}</h3>
          <p className="sheet-text" data-reveal>{text}</p>
          <div className="sheet-media" data-reveal style={{ '--i': 1 }}>
            <Fragment />
          </div>
        </article>
      ))}
    </div>
  </section>
)

export default FeatureSheets
