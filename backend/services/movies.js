import { prisma } from '../config/database.js'
import { drawMovie as drawFromLottery } from './lottery/index.js'
import { requireUserProfile } from '../lib/profileHelpers.js'
import { toIntOrNull } from '../lib/parsers.js'
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../lib/httpErrors.js'

const VALID_TYPES = ['MOVIE', 'SERIES', 'ANIME']
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

// `include` padrão: traz quem adicionou (id + nome). Reusado em várias queries.
const INCLUDE_ADDED_BY = {
  addedBy: { select: { id: true, name: true } },
}

// ─── Helpers internos ───────────────────────────────────────────────────────

const normalizeType = (type) => {
  if (!type) {
    throw new ValidationError('Tipo é obrigatório')
  }
  const upper = type.toUpperCase()
  if (!VALID_TYPES.includes(upper)) {
    throw new ValidationError('Tipo inválido. Use: MOVIE, SERIES ou ANIME')
  }
  return upper
}

const normalizePriority = (priority) => {
  if (!priority) return 'MEDIUM'
  const upper = priority.toUpperCase()
  if (!VALID_PRIORITIES.includes(upper)) {
    throw new ValidationError('Prioridade inválida. Use: LOW, MEDIUM, HIGH ou URGENT')
  }
  return upper
}

// Valida e converte rating em Decimal. Aceita null/undefined (devolve null).
const normalizeRating = (rating) => {
  if (rating === undefined || rating === null) return null
  const parsed = parseFloat(rating)
  if (isNaN(parsed) || parsed < 0 || parsed > 10) {
    throw new ValidationError('Rating deve ser um número entre 0 e 10')
  }
  return parsed
}

// Verifica duplicata por externalId (preferencial) ou por title+type (fallback).
const ensureNotDuplicate = async (addedById, { externalId, title, type }) => {
  if (externalId) {
    const byExternal = await prisma.movie.findFirst({
      where: { addedById, externalId: externalId.toString() },
    })
    if (byExternal) {
      throw new ConflictError('Este filme já está na sua lista')
    }
  }

  const byTitle = await prisma.movie.findFirst({
    where: {
      addedById,
      type,
      title: { equals: title, mode: 'insensitive' },
    },
  })
  if (byTitle) {
    throw new ConflictError('Este filme já está na sua lista')
  }
}

// Busca movie garantindo que pertence ao perfil. Lança 404 se não achar.
const requireOwnedMovie = async (movieId, profileId) => {
  const movie = await prisma.movie.findFirst({
    where: { id: movieId, addedById: profileId },
  })
  if (!movie) {
    throw new NotFoundError('Filme não encontrado')
  }
  return movie
}

// Constrói o objeto de update a partir do payload, ignorando campos undefined.
// Campos que aceitam null explícito (rating, year, duration) são tratados aqui.
const buildUpdateData = (payload) => {
  const data = {}

  if (payload.title !== undefined) data.title = payload.title
  if (payload.type !== undefined) data.type = normalizeType(payload.type)
  if (payload.description !== undefined) data.description = payload.description
  if (payload.poster !== undefined) data.poster = payload.poster
  if (payload.year !== undefined) data.year = toIntOrNull(payload.year)
  if (payload.duration !== undefined) data.duration = toIntOrNull(payload.duration)
  if (payload.genres !== undefined) {
    data.genres = Array.isArray(payload.genres) ? payload.genres : []
  }
  if (payload.rating !== undefined) data.rating = normalizeRating(payload.rating)
  if (payload.priority !== undefined) data.priority = normalizePriority(payload.priority)
  if (payload.isNew !== undefined) data.isNew = Boolean(payload.isNew)

  // `watched` toggle: marcar como assistido seta watchedAt automaticamente;
  // desmarcar limpa watchedAt. watchedAt explícito no payload sobrescreve.
  if (payload.watched !== undefined) {
    data.watched = Boolean(payload.watched)
    if (payload.watched && !payload.watchedAt) {
      data.watchedAt = new Date()
    } else if (!payload.watched) {
      data.watchedAt = null
    }
  }
  if (payload.watchedAt !== undefined) {
    data.watchedAt = payload.watchedAt ? new Date(payload.watchedAt) : null
  }

  return data
}

// ─── Operações públicas ─────────────────────────────────────────────────────

export const listMovies = async (userId, filters = {}) => {
  // Lista vazia em vez de 404: usuário sem profile ainda não tem lista.
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) return []

  const where = { addedById: profile.id }
  if (filters.type) where.type = filters.type.toUpperCase()
  if (filters.watched !== undefined) where.watched = filters.watched === 'true'

  return prisma.movie.findMany({
    where,
    include: INCLUDE_ADDED_BY,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
}

export const getMovieById = async (userId, movieId) => {
  const profile = await requireUserProfile(userId)
  const movie = await prisma.movie.findFirst({
    where: { id: movieId, addedById: profile.id },
    include: INCLUDE_ADDED_BY,
  })
  if (!movie) {
    throw new NotFoundError('Filme não encontrado')
  }
  return movie
}

export const createMovie = async (userId, payload) => {
  if (!payload.title) {
    throw new ValidationError('Título é obrigatório')
  }

  const type = normalizeType(payload.type)
  const priority = normalizePriority(payload.priority)
  const rating = normalizeRating(payload.rating)

  const profile = await requireUserProfile(userId)

  await ensureNotDuplicate(profile.id, {
    externalId: payload.externalId,
    title: payload.title,
    type,
  })

  return prisma.movie.create({
    data: {
      title: payload.title,
      type,
      description: payload.description || null,
      poster: payload.poster || null,
      year: toIntOrNull(payload.year),
      duration: toIntOrNull(payload.duration),
      genres: Array.isArray(payload.genres) ? payload.genres : [],
      rating,
      priority,
      isNew: Boolean(payload.isNew),
      externalId: payload.externalId || null,
      addedById: profile.id,
    },
    include: INCLUDE_ADDED_BY,
  })
}

export const updateMovie = async (userId, movieId, payload) => {
  const profile = await requireUserProfile(userId)
  await requireOwnedMovie(movieId, profile.id)

  const data = buildUpdateData(payload)

  return prisma.movie.update({
    where: { id: movieId },
    data,
    include: INCLUDE_ADDED_BY,
  })
}

export const deleteMovie = async (userId, movieId) => {
  const profile = await requireUserProfile(userId)
  await requireOwnedMovie(movieId, profile.id)

  await prisma.movie.delete({ where: { id: movieId } })
}

// Normaliza filtros vindos do client. Tipos inválidos lançam ValidationError;
// gêneros são strings livres (TMDB/Jikan retornam nomes em pt-BR/en).
const normalizeDrawFilters = (filters = {}) => {
  const out = {}

  if (Array.isArray(filters.types) && filters.types.length > 0) {
    out.types = filters.types.map((t) => normalizeType(t))
  }
  if (Array.isArray(filters.genres) && filters.genres.length > 0) {
    out.genres = filters.genres.filter((g) => typeof g === 'string' && g.trim()).map((g) => g.trim())
  }
  if (Array.isArray(filters.priorities) && filters.priorities.length > 0) {
    out.priorities = filters.priorities.map((p) => p.toUpperCase()).filter((p) => VALID_PRIORITIES.includes(p))
  }
  if (filters.ignoreWatched) {
    out.ignoreWatched = true
  }

  return out
}

export const drawForUser = async (userId, filters = {}) => {
  const profile = await requireUserProfile(userId)
  const normalized = normalizeDrawFilters(filters)
  const { movie, reason } = await drawFromLottery(profile.id, normalized)
  if (movie) return movie

  if (reason === 'NO_MATCH') {
    throw new NotFoundError('Nenhum item da sua lista corresponde aos filtros', { code: 'NO_MATCH' })
  }
  throw new NotFoundError('Sua lista está vazia', { code: 'EMPTY_LIST' })
}
