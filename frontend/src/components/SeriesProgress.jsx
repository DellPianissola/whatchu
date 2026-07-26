import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import IconButton from './IconButton.jsx'
import { pluralize } from '../utils/content.js'
import {
  watchableSeasons,
  watchedInSeason,
  airedInSeason,
  summarizeProgress,
} from '../utils/seriesProgress.js'
import './SeriesProgress.css'

const EpisodeStrip = ({ season, pointer, lastAired, onPick }) => {
  const stripRef = useRef(null)
  const currentRef = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const [focused, setFocused] = useState(null)

  const aired   = airedInSeason(season, lastAired)
  const watched = watchedInSeason(season, pointer)
  const current = pointer?.season === season.number ? pointer.episode : null

  const measure = useCallback(() => {
    const strip = stripRef.current
    if (!strip) return
    const max = strip.scrollWidth - strip.clientWidth
    setEdges({ left: strip.scrollLeft > 1, right: strip.scrollLeft < max - 1 })
  }, [])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(strip)
    return () => observer.disconnect()
  }, [measure])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const chip = currentRef.current
    // scrollIntoView arrastaria o modal na vertical junto — posiciona só a faixa.
    strip.scrollLeft = chip
      ? chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2
      : 0
  }, [current])

  const scrollBy = (direction) => {
    const strip = stripRef.current
    if (strip) strip.scrollBy({ left: direction * strip.clientWidth, behavior: 'smooth' })
  }

  // Roving tabindex: a faixa é uma parada de tab só, senão 300 episódios viram
  // 300 paradas. Setinha anda entre os chips.
  const tabStop = focused ?? current ?? 1
  const handleKeyDown = (event) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const last = aired || 1
    const next = Math.min(last, Math.max(1, tabStop + delta))
    setFocused(next)
    stripRef.current?.querySelector(`[data-episode="${next}"]`)?.focus()
  }

  const episodes = Array.from({ length: season.episodeCount }, (_, i) => i + 1)

  return (
    <div className="ui-series-progress-strip-wrap">
      <IconButton
        icon={<ChevronLeft size={16} />}
        label="Episódios anteriores"
        size="sm"
        className="ui-series-progress-arrow"
        onClick={() => scrollBy(-1)}
        disabled={!edges.left}
        tabIndex={-1}
      />

      <div
        className="ui-series-progress-strip"
        ref={stripRef}
        onScroll={measure}
        onKeyDown={handleKeyDown}
      >
        {episodes.map(episode => {
          const isCurrent = episode === current
          const unaired   = episode > aired
          const state     = isCurrent ? 'current'
            : episode <= watched ? 'watched'
            : unaired ? 'unaired'
            : 'pending'

          return (
            <button
              key={episode}
              ref={isCurrent ? currentRef : null}
              type="button"
              data-episode={episode}
              className={`ui-series-progress-chip is-${state}`}
              aria-pressed={isCurrent}
              aria-label={`Temporada ${season.number}, episódio ${episode}${unaired ? ' (não lançado)' : ''}`}
              disabled={unaired}
              title={unaired ? 'Episódio ainda não lançado' : ''}
              tabIndex={episode === tabStop ? 0 : -1}
              onClick={() => onPick(season.number, episode)}
            >
              {episode}
            </button>
          )
        })}
      </div>

      <IconButton
        icon={<ChevronRight size={16} />}
        label="Próximos episódios"
        size="sm"
        className="ui-series-progress-arrow"
        onClick={() => scrollBy(1)}
        disabled={!edges.right}
        tabIndex={-1}
      />
    </div>
  )
}

const SeriesProgress = ({ seasonList, lastAired, value, onChange }) => {
  const [toggled, setToggled] = useState({})

  const seasons = watchableSeasons(seasonList)
  if (!seasons.length) return null

  const { watched, aired, percent } = summarizeProgress(seasons, value, lastAired)

  // Espelhar a temporada do ponteiro em state criaria sync loop a cada marcação.
  const defaultOpen = seasons.find(s => s.number === value?.season) ?? seasons[0]
  const isOpen = (season) => toggled[season.number] ?? (season.number === defaultOpen.number)

  const handlePick = (season, episode) => {
    const same = value?.season === season && value?.episode === episode
    onChange(same ? null : { season, episode })
  }

  return (
    <section className="ui-series-progress">
      <div className="ui-series-progress-header">
        <span className="ui-detail-section-label">Onde você parou</span>
        <span className="ui-series-progress-mark">
          {value ? `T${value.season} · E${value.episode}` : 'Não comecei'}
        </span>
      </div>

      <div className="ui-series-progress-bar-row">
        <div className="ui-series-progress-bar">
          <div
            className="ui-series-progress-bar-fill"
            style={{ width: `${aired ? (watched / aired) * 100 : 0}%` }}
          />
        </div>
        <span className="ui-series-progress-count">{percent}%</span>
      </div>

      <div className="ui-series-progress-seasons">
        {seasons.map(season => {
          const seen     = watchedInSeason(season, value)
          const complete = seen === season.episodeCount
          const open     = isOpen(season)

          return (
            <div key={season.number} className="ui-series-progress-season">
              <button
                type="button"
                className={`ui-series-progress-season-header ${open ? 'is-open' : ''}`}
                aria-expanded={open}
                onClick={() => setToggled(t => ({ ...t, [season.number]: !open }))}
              >
                <ChevronDown size={14} className="ui-series-progress-season-caret" aria-hidden />
                <span className="ui-series-progress-season-name">Temporada {season.number}</span>
                {complete ? (
                  <span className="ui-series-progress-season-done">
                    <Check size={13} aria-hidden /> completa
                  </span>
                ) : (
                  <span className="ui-series-progress-season-meta">
                    {seen > 0
                      ? `${seen} de ${season.episodeCount}`
                      : `${season.episodeCount} ${pluralize(season.episodeCount, 'episódio', 'episódios')}`}
                  </span>
                )}
              </button>

              {open && (
                <EpisodeStrip
                  season={season}
                  pointer={value}
                  lastAired={lastAired}
                  onPick={handlePick}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default SeriesProgress
