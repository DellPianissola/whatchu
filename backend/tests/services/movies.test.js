import { describe, it, expect, beforeEach } from 'vitest'
import {
  listMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  drawForUser,
} from '../../services/movies.js'
import { prisma, truncateAll } from '../helpers/db.js'
import {
  createUser,
  createProfile,
  createMovie as createMovieFactory,
} from '../helpers/factories.js'
import { ValidationError, NotFoundError, ConflictError } from '../../lib/httpErrors.js'

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
      expect(result.title).toBe('Para Sortear')
    })

    it('lança NotFoundError com code EMPTY_LIST quando a lista está vazia', async () => {
      const err = await drawForUser(user.id).catch(e => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect(err.code).toBe('EMPTY_LIST')
    })

    it('inclui filmes assistidos no sorteio', async () => {
      await createMovieFactory(profile.id, { title: 'Assistido', watched: true })
      const result = await drawForUser(user.id)
      expect(result.title).toBe('Assistido')
    })
  })
})
