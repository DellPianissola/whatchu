export const TYPE_LABEL = {
  MOVIE: 'Filme',
  SERIES: 'Série',
}

export const TYPE_LABEL_PLURAL = {
  MOVIE: 'Filmes',
  SERIES: 'Séries',
}

export const ALL_TYPES = Object.keys(TYPE_LABEL)

export const PRIORITY_VALUES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

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

export const PRIORITY_OPTIONS = PRIORITY_VALUES.map((value) => ({
  value,
  label: PRIORITY_LABEL[value],
}))

export const formatDuration = (minutes) => {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

export const displayYear = (year) => year ?? 'Sem data'

export const displayRating = (rating) =>
  rating ? `${Number(rating).toFixed(1)}` : 'Sem nota'

export const displayGenres = (genres) =>
  genres && genres.length > 0 ? genres.join(', ') : 'Sem gênero'

export const pluralize = (n, singular, plural) =>
  n === 1 ? singular : plural

export const todayISODate = () => new Date().toISOString().split('T')[0]

export const teamMembers = (details) => {
  const { director, cast } = details ?? {}
  // O detailsCache é de sessão: aba aberta antes do deploy ainda serve o `cast`
  // como array de strings, sem papel.
  const people = (cast ?? []).map(c => (typeof c === 'string' ? { name: c, character: null } : c))
  if (!director) return people

  return [
    { name: director, character: 'Diretor' },
    ...people.filter(p => p.name !== director),
  ]
}
