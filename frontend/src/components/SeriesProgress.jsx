import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import ScrollStrip from './ScrollStrip.jsx'
import { pluralize } from '../utils/content.js'
import {
  watchableSeasons,
  watchedInSeason,
  airedInSeason,
  summarizeProgress,
} from '../utils/seriesProgress.js'
import './SeriesProgress.css'

const EpisodeStrip = ({ season, pointer, lastAired, onPick }) => {
  const tabStopRef = useRef(null)
  const [focused, setFocused] = useState(null)

  const aired   = airedInSeason(season, lastAired)
  const watched = watchedInSeason(season, pointer)
  const current = pointer?.season === season.number ? pointer.episode : null

  // Roving tabindex: a faixa é uma parada de tab só, senão 300 episódios viram
  // 300 paradas.
  const tabStop = focused ?? current ?? 1

  useEffect(() => {
    if (focused !== null) tabStopRef.current?.focus()
  }, [focused])

  const handleKeyDown = (event) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    setFocused(Math.min(aired || 1, Math.max(1, tabStop + delta)))
  }

  const episodes = Array.from({ length: season.episodeCount }, (_, i) => i + 1)

  return (
    <ScrollStrip
      prevLabel="Episódios anteriores"
      nextLabel="Próximos episódios"
      activeRef={tabStopRef}
      activeKey={`${season.number}:${tabStop}`}
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
            ref={episode === tabStop ? tabStopRef : null}
            type="button"
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
    </ScrollStrip>
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
