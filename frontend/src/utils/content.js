export const TYPE_LABEL = {
  MOVIE: 'Filme',
  SERIES: 'Série',
  ANIME: 'Anime',
}

export const PRIORITY_COLOR = {
  URGENT: 'var(--priority-urgent)',
  HIGH:   'var(--priority-high)',
  MEDIUM: 'var(--priority-medium)',
  LOW:    'var(--priority-low)',
}

export const PRIORITY_LABEL = {
  URGENT: 'Máxima',
  HIGH:   'Alta',
  MEDIUM: 'Média',
  LOW:    'Baixa',
}

export const formatDuration = (minutes) => {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}
