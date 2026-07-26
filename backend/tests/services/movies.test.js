import { describe, it, expect, beforeEach } from 'vitest'
import {
  listMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  drawForUser,
  previewDrawForUser,
} from '../../services/movies.js'
import { prisma, truncateAll } from '../helpers/db.js'
import {
  createUser,
  createProfile,
  createFriendship,
  createMovie as createMovieFactory,
} from '../helpers/factories.js'
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../../lib/httpErrors.js'

describe('movies service', () => {
  let user, profile

  beforeEach(async () => {
    await truncateAll()
    user    = await createUser()
    profile = await createProfile(user.id)
  })

  // ─── listMovies ───────────────────────────────────────────────────────────

  describe('listMovies', () => {
    it('devolve [] quando não há filmes', async () => {
      expect(await listMovies(user.id)).toEqual([])
    })

    it('devolve [] quando usuário não tem perfil (sem lançar erro)', async () => {
      const semPerfil = await createUser({ username: 'semperfil' })
      expect(await listMovies(semPerfil.id)).toEqual([])
    })

    it('devolve todos os filmes do perfil', async () => {
      await createMovieFactory(profile.id, { title: 'A' })
      await createMovieFactory(profile.id, { title: 'B' })
      const result = await listMovies(user.id)
      expect(result).toHaveLength(2)
    })

    it('filtra por type', async () => {
      await createMovieFactory(profile.id, { title: 'Filme', type: 'MOVIE' })
      await createMovieFactory(profile.id, { title: 'Série', type: 'SERIES' })
      const result = await listMovies(user.id, { type: 'movie' })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Filme')
    })

    it('filtra por watched=true', async () => {
      await createMovieFactory(profile.id, { title: 'Assistido', watched: true })
      await createMovieFactory(profile.id, { title: 'Pendente',  watched: false })
      const result = await listMovies(user.id, { watched: 'true' })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Assistido')
    })

    it('filtra por watched=false', async () => {
      await createMovieFactory(profile.id, { title: 'Assistido', watched: true })
      await createMovieFactory(profile.id, { title: 'Pendente',  watched: false })
      const result = await listMovies(user.id, { watched: 'false' })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Pendente')
    })
  })

  // ─── getMovieById ─────────────────────────────────────────────────────────

  describe('getMovieById', () => {
    it('devolve o filme quando pertence ao profile', async () => {
      const movie  = await createMovieFactory(profile.id, { title: 'Meu Filme' })
      const result = await getMovieById(user.id, movie.id)
      expect(result.title).toBe('Meu Filme')
      expect(result.addedBy).toBeDefined()
    })

    it('lança NotFoundError para ID inexistente', async () => {
      await expect(
        getMovieById(user.id, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError)
    })

    it('lança NotFoundError quando o filme pertence a outro perfil', async () => {
      const outro       = await createUser({ username: 'outro' })
      const outroPerfil = await createProfile(outro.id)
      const filmeAlheio = await createMovieFactory(outroPerfil.id)
      await expect(getMovieById(user.id, filmeAlheio.id)).rejects.toThrow(NotFoundError)
    })
  })

  // ─── createMovie ──────────────────────────────────────────────────────────

  describe('createMovie', () => {
    it('cria filme com dados mínimos e defaults corretos', async () => {
      const result = await createMovie(user.id, { title: 'Novo', type: 'MOVIE' })
      expect(result.title).toBe('Novo')
      expect(result.type).toBe('MOVIE')
      expect(result.priority).toBe('MEDIUM')
      expect(result.watched).toBe(false)
    })

    it('aceita type em lowercase (normaliza para uppercase)', async () => {
      const result = await createMovie(user.id, { title: 'X', type: 'series' })
      expect(result.type).toBe('SERIES')
    })

    it('lança ValidationError quando falta título', async () => {
      await expect(createMovie(user.id, { type: 'MOVIE' })).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para tipo inválido', async () => {
      await expect(
        createMovie(user.id, { title: 'X', type: 'LIVRO' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para rating fora do intervalo 0-10', async () => {
      await expect(
        createMovie(user.id, { title: 'X', type: 'MOVIE', rating: 11 })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ConflictError para externalId duplicado no mesmo perfil', async () => {
      await createMovieFactory(profile.id, { externalId: 'ext-123' })
      await expect(
        createMovie(user.id, { title: 'Outro', type: 'MOVIE', externalId: 'ext-123' })
      ).rejects.toThrow(ConflictError)
    })

    it('permite mesmo externalId com types diferentes (IDs do TMDB colidem entre movie e tv)', async () => {
      await createMovieFactory(profile.id, { title: 'Fargo', type: 'MOVIE', externalId: '275' })
      const serie = await createMovie(user.id, { title: 'Fargo', type: 'SERIES', externalId: '275' })
      expect(serie.type).toBe('SERIES')
    })

    it('lança ConflictError para title+type duplicado (case-insensitive)', async () => {
      await createMovieFactory(profile.id, { title: 'Duplicado', type: 'MOVIE' })
      await expect(
        createMovie(user.id, { title: 'DUPLICADO', type: 'MOVIE' })
      ).rejects.toThrow(ConflictError)
    })

    it('permite o mesmo título em tipo diferente', async () => {
      await createMovieFactory(profile.id, { title: 'Igual', type: 'MOVIE' })
      const result = await createMovie(user.id, { title: 'Igual', type: 'SERIES' })
      expect(result.title).toBe('Igual')
    })
  })

  // ─── updateMovie ──────────────────────────────────────────────────────────

  describe('updateMovie', () => {
    it('atualiza campos fornecidos', async () => {
      const movie   = await createMovieFactory(profile.id, { title: 'Antigo', priority: 'LOW' })
      const updated = await updateMovie(user.id, movie.id, { title: 'Novo', priority: 'HIGH' })
      expect(updated.title).toBe('Novo')
      expect(updated.priority).toBe('HIGH')
    })

    it('campos undefined no payload não alteram o registro', async () => {
      const movie   = await createMovieFactory(profile.id, { title: 'Mantido' })
      const updated = await updateMovie(user.id, movie.id, {})
      expect(updated.title).toBe('Mantido')
    })

    it('marcar watched: true seta watchedAt automaticamente', async () => {
      const movie   = await createMovieFactory(profile.id)
      const updated = await updateMovie(user.id, movie.id, { watched: true })
      expect(updated.watched).toBe(true)
      expect(updated.watchedAt).toBeInstanceOf(Date)
    })

    it('marcar watched: false limpa watchedAt', async () => {
      const movie   = await createMovieFactory(profile.id, { watched: true, watchedAt: new Date() })
      const updated = await updateMovie(user.id, movie.id, { watched: false })
      expect(updated.watched).toBe(false)
      expect(updated.watchedAt).toBeNull()
    })

    it('lança NotFoundError quando o filme pertence a outro perfil', async () => {
      const outro       = await createUser({ username: 'outro2' })
      const outroPerfil = await createProfile(outro.id)
      const filmeAlheio = await createMovieFactory(outroPerfil.id)
      await expect(updateMovie(user.id, filmeAlheio.id, { title: 'X' })).rejects.toThrow(NotFoundError)
    })

    it('grava o ponteiro de episódio em série', async () => {
      const serie   = await createMovieFactory(profile.id, { type: 'SERIES' })
      const updated = await updateMovie(user.id, serie.id, { lastSeason: 3, lastEpisode: 7 })
      expect(updated.lastSeason).toBe(3)
      expect(updated.lastEpisode).toBe(7)
    })

    it('limpa o ponteiro quando os dois campos vêm nulos', async () => {
      const serie = await createMovieFactory(profile.id, { type: 'SERIES', lastSeason: 2, lastEpisode: 4 })
      const updated = await updateMovie(user.id, serie.id, { lastSeason: null, lastEpisode: null })
      expect(updated.lastSeason).toBeNull()
      expect(updated.lastEpisode).toBeNull()
    })

    it('recusa temporada sem episódio', async () => {
      const serie = await createMovieFactory(profile.id, { type: 'SERIES' })
      await expect(updateMovie(user.id, serie.id, { lastSeason: 3 })).rejects.toThrow(ValidationError)
    })

    it('recusa temporada ou episódio menor que 1', async () => {
      const serie = await createMovieFactory(profile.id, { type: 'SERIES' })
      await expect(updateMovie(user.id, serie.id, { lastSeason: 0, lastEpisode: 1 })).rejects.toThrow(ValidationError)
      await expect(updateMovie(user.id, serie.id, { lastSeason: 1, lastEpisode: 0 })).rejects.toThrow(ValidationError)
    })

    it('recusa ponteiro de episódio em filme', async () => {
      const filme = await createMovieFactory(profile.id, { type: 'MOVIE' })
      await expect(updateMovie(user.id, filme.id, { lastSeason: 1, lastEpisode: 1 })).rejects.toThrow(ValidationError)
    })

    it('desmarcar watched junto com progresso preserva watchedAt', async () => {
      const terminadaEm = new Date('2026-03-10T12:00:00Z')
      const serie = await createMovieFactory(profile.id, {
        type: 'SERIES',
        watched: true,
        watchedAt: terminadaEm,
      })

      const updated = await updateMovie(user.id, serie.id, {
        lastSeason: 1,
        lastEpisode: 1,
        watched: false,
      })

      expect(updated.watched).toBe(false)
      expect(updated.watchedAt).toEqual(terminadaEm)
    })

    it('remarcar watched junto com progresso preserva a data original', async () => {
      const terminadaEm = new Date('2026-03-10T12:00:00Z')
      const serie = await createMovieFactory(profile.id, {
        type: 'SERIES',
        watched: false,
        watchedAt: terminadaEm,
        lastSeason: 1,
        lastEpisode: 1,
      })

      const updated = await updateMovie(user.id, serie.id, {
        lastSeason: 2,
        lastEpisode: 12,
        watched: true,
      })

      expect(updated.watched).toBe(true)
      expect(updated.watchedAt).toEqual(terminadaEm)
    })

    it('progresso preenche watchedAt quando ainda não havia data', async () => {
      const serie = await createMovieFactory(profile.id, { type: 'SERIES', watched: false })

      const updated = await updateMovie(user.id, serie.id, {
        lastSeason: 1,
        lastEpisode: 10,
        watched: true,
      })

      expect(updated.watchedAt).toBeInstanceOf(Date)
    })

    it('marcar watched pelo toggle restampa a data', async () => {
      const antiga = new Date('2020-01-01T00:00:00Z')
      const serie  = await createMovieFactory(profile.id, { type: 'SERIES', watchedAt: antiga })

      const updated = await updateMovie(user.id, serie.id, { watched: true })

      expect(updated.watchedAt).not.toEqual(antiga)
    })

    it('desmarcar watched sem progresso continua limpando watchedAt', async () => {
      const serie = await createMovieFactory(profile.id, {
        type: 'SERIES',
        watched: true,
        watchedAt: new Date(),
      })

      const updated = await updateMovie(user.id, serie.id, { watched: false })

      expect(updated.watchedAt).toBeNull()
    })
  })

  // ─── deleteMovie ──────────────────────────────────────────────────────────

  describe('deleteMovie', () => {
    it('remove o filme do banco', async () => {
      const movie = await createMovieFactory(profile.id)
      await deleteMovie(user.id, movie.id)
      const found = await prisma.movie.findUnique({ where: { id: movie.id } })
      expect(found).toBeNull()
    })

    it('lança NotFoundError para ID inexistente', async () => {
      await expect(
        deleteMovie(user.id, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError)
    })

    it('lança NotFoundError quando o filme é de outro perfil', async () => {
      const outro       = await createUser({ username: 'outro3' })
      const outroPerfil = await createProfile(outro.id)
      const filmeAlheio = await createMovieFactory(outroPerfil.id)
      await expect(deleteMovie(user.id, filmeAlheio.id)).rejects.toThrow(NotFoundError)
    })
  })

  // ─── drawForUser ──────────────────────────────────────────────────────────

  describe('drawForUser', () => {
    it('retorna um filme quando a lista tem itens', async () => {
      await createMovieFactory(profile.id, { title: 'Para Sortear' })
      const result = await drawForUser(user.id)
      expect(result.movie.title).toBe('Para Sortear')
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0].profileId).toBe(profile.id)
    })

    it('lança NotFoundError com code EMPTY_LIST quando a lista está vazia', async () => {
      const err = await drawForUser(user.id).catch(e => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect(err.code).toBe('EMPTY_LIST')
    })

    it('inclui filmes assistidos no sorteio', async () => {
      await createMovieFactory(profile.id, { title: 'Assistido', watched: true })
      const result = await drawForUser(user.id)
      expect(result.movie.title).toBe('Assistido')
    })

    it('filtra por providers via keys de streaming', async () => {
      await createMovieFactory(profile.id, { title: 'OnNetflix', providers: [8] })
      await createMovieFactory(profile.id, { title: 'OnDisney',  providers: [337] })

      const result = await drawForUser(user.id, { providers: ['netflix'] })
      expect(result.movie.title).toBe('OnNetflix')
    })

    it('keys de streaming inválidas são ignoradas (sem aplicar filtro)', async () => {
      await createMovieFactory(profile.id, { title: 'Any', providers: [] })
      const result = await drawForUser(user.id, { providers: ['fake-streaming'] })
      expect(result.movie.title).toBe('Any')
    })

    it('sorteia com a lista de um amigo aceito via friendIds', async () => {
      const amigo       = await createUser({ username: 'amigodraw' })
      const amigoPerfil = await createProfile(amigo.id)
      await createFriendship(profile.id, amigoPerfil.id)
      await createMovieFactory(amigoPerfil.id, { title: 'Do Amigo' })

      const result = await drawForUser(user.id, { friendIds: [amigoPerfil.id] })
      expect(result.movie.title).toBe('Do Amigo')
      expect(result.sources[0].profileId).toBe(amigoPerfil.id)
    })

    it('lança ForbiddenError quando friendIds contém quem não é amigo aceito', async () => {
      const estranho       = await createUser({ username: 'estranhodraw' })
      const estranhoPerfil = await createProfile(estranho.id)
      await createMovieFactory(profile.id)

      await expect(drawForUser(user.id, { friendIds: [estranhoPerfil.id] }))
        .rejects.toThrow(ForbiddenError)
    })
  })

  describe('previewDrawForUser', () => {
    it('devolve total e comuns do pote combinado', async () => {
      const amigo       = await createUser({ username: 'amigoprev' })
      const amigoPerfil = await createProfile(amigo.id)
      await createFriendship(profile.id, amigoPerfil.id)

      await createMovieFactory(profile.id,     { title: 'Comum', externalId: '100' })
      await createMovieFactory(amigoPerfil.id, { title: 'Comum', externalId: '100' })
      await createMovieFactory(amigoPerfil.id, { title: 'Extra', externalId: '200' })

      const result = await previewDrawForUser(user.id, { friendIds: [amigoPerfil.id] })
      expect(result).toEqual({ total: 2, common: 1 })
    })

    it('valida amizade como no draw (ForbiddenError)', async () => {
      const estranho       = await createUser({ username: 'estranhoprev' })
      const estranhoPerfil = await createProfile(estranho.id)

      await expect(previewDrawForUser(user.id, { friendIds: [estranhoPerfil.id] }))
        .rejects.toThrow(ForbiddenError)
    })
  })
})
