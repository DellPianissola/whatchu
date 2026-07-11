import { describe, it, expect, beforeEach } from 'vitest'
import { drawMovie } from '../../services/lottery/index.js'
import { truncateAll } from '../helpers/db.js'
import { createUser, createProfile, createMovie } from '../helpers/factories.js'

describe('lottery: drawMovie', () => {
  let profile

  beforeEach(async () => {
    await truncateAll()
    const user = await createUser()
    profile    = await createProfile(user.id)
  })

  it('devolve movie:null + reason EMPTY_LIST quando a lista está vazia', async () => {
    const result = await drawMovie(profile.id)
    expect(result.movie).toBeNull()
    expect(result.reason).toBe('EMPTY_LIST')
  })

  it('devolve movie:null + reason NO_MATCH quando filtros excluem tudo', async () => {
    await createMovie(profile.id, { title: 'A', type: 'MOVIE' })
    const result = await drawMovie(profile.id, { types: ['SERIES'] })
    expect(result.movie).toBeNull()
    expect(result.reason).toBe('NO_MATCH')
  })

  it('devolve o único item quando há apenas um filme', async () => {
    const movie  = await createMovie(profile.id, { title: 'Único' })
    const result = await drawMovie(profile.id)
    expect(result.movie.id).toBe(movie.id)
  })

  it('devolve um dos filmes quando há múltiplos', async () => {
    await createMovie(profile.id, { title: 'A' })
    await createMovie(profile.id, { title: 'B' })
    await createMovie(profile.id, { title: 'C' })
    const result = await drawMovie(profile.id)
    expect(['A', 'B', 'C']).toContain(result.movie.title)
  })

  it('inclui filmes assistidos no sorteio por padrão', async () => {
    // Regra: considera TODOS os filmes, assistidos ou não
    const movie  = await createMovie(profile.id, { title: 'Assistido', watched: true })
    const result = await drawMovie(profile.id)
    expect(result.movie.id).toBe(movie.id)
  })

  it('exclui assistidos quando ignoreWatched:true', async () => {
    await createMovie(profile.id, { title: 'Visto',    watched: true })
    await createMovie(profile.id, { title: 'NaoVisto', watched: false })
    const result = await drawMovie(profile.id, { ignoreWatched: true })
    expect(result.movie.title).toBe('NaoVisto')
  })

  it('favorece filmes URGENT no pool ponderado', async () => {
    // Pesos atuais: URGENT 64, LOW 1 → ~98% de chance pra URGENT.
    // Limiar conservador de 85% pra evitar flakiness.
    await createMovie(profile.id, { title: 'URGENT', priority: 'URGENT' })
    await createMovie(profile.id, { title: 'LOW',    priority: 'LOW'    })

    let urgentCount = 0
    for (let i = 0; i < 100; i++) {
      const r = await drawMovie(profile.id)
      if (r.movie.title === 'URGENT') urgentCount++
    }
    expect(urgentCount).toBeGreaterThan(85)
  })

  it('config customizada pode desligar o peso de prioridade', async () => {
    // Com priority desligado, URGENT e LOW têm chances iguais (~50/50).
    // Aceita uma janela larga pra não ficar flaky.
    await createMovie(profile.id, { title: 'URGENT', priority: 'URGENT' })
    await createMovie(profile.id, { title: 'LOW',    priority: 'LOW'    })

    const config = {
      priority: { enabled: false, weights: {} },
      age:      { enabled: false, maxBoost: 1, fullMonths: 1 },
    }

    let urgentCount = 0
    for (let i = 0; i < 200; i++) {
      const r = await drawMovie(profile.id, {}, config)
      if (r.movie.title === 'URGENT') urgentCount++
    }
    expect(urgentCount).toBeGreaterThan(60)
    expect(urgentCount).toBeLessThan(140)
  })

  it('devolve o filme com addedBy populado', async () => {
    await createMovie(profile.id, { title: 'Com Relação' })
    const result = await drawMovie(profile.id)
    expect(result.movie.addedBy).toBeDefined()
    expect(result.movie.addedBy.id).toBe(profile.id)
  })

  it('filtro de providers só inclui movies com providers que batem', async () => {
    await createMovie(profile.id, { title: 'Netflix',  providers: [8] })
    await createMovie(profile.id, { title: 'Disney',   providers: [337] })
    await createMovie(profile.id, { title: 'NaoVisto', providers: [] })

    const result = await drawMovie(profile.id, { providerTmdbIds: [8, 1796] })
    expect(result.movie.title).toBe('Netflix')
  })

  it('NO_MATCH quando providers não batem com nenhum movie', async () => {
    await createMovie(profile.id, { title: 'Disney', providers: [337] })
    const result = await drawMovie(profile.id, { providerTmdbIds: [8] })
    expect(result.movie).toBeNull()
    expect(result.reason).toBe('NO_MATCH')
  })

  it('movies sem providers (manual ou backfill pendente) ficam fora do filtro de streaming', async () => {
    await createMovie(profile.id, { title: 'SemProvider', providers: [] })
    const result = await drawMovie(profile.id, { providerTmdbIds: [8] })
    expect(result.movie).toBeNull()
    expect(result.reason).toBe('NO_MATCH')
  })

  describe('multi-profile (sorteio com amigos)', () => {
    let amigoPerfil

    beforeEach(async () => {
      const amigo = await createUser({ username: 'amigo' })
      amigoPerfil = await createProfile(amigo.id, { name: 'Amigo' })
    })

    it('considera itens das listas de todos os perfis', async () => {
      const movie  = await createMovie(amigoPerfil.id, { title: 'Só do Amigo' })
      const result = await drawMovie([profile.id, amigoPerfil.id])
      expect(result.movie.id).toBe(movie.id)
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0]).toMatchObject({ profileId: amigoPerfil.id, name: 'Amigo' })
    })

    it('deduplica por externalId e devolve as duas sources', async () => {
      await createMovie(profile.id,     { title: 'Duna', externalId: '438631' })
      await createMovie(amigoPerfil.id, { title: 'Duna', externalId: '438631' })

      const result = await drawMovie([profile.id, amigoPerfil.id])
      expect(result.movie.addedBy.id).toBe(profile.id)
      expect(result.sources).toHaveLength(2)
      expect(result.sources.map((s) => s.profileId).sort())
        .toEqual([profile.id, amigoPerfil.id].sort())
    })

    it('mesmo externalId com types diferentes NÃO deduplica', async () => {
      await createMovie(profile.id,     { title: 'Fargo', externalId: '275', type: 'MOVIE' })
      await createMovie(amigoPerfil.id, { title: 'Fargo', externalId: '275', type: 'SERIES' })

      const result = await drawMovie([profile.id, amigoPerfil.id])
      expect(result.sources).toHaveLength(1)
    })

    it('sem externalId, deduplica por título (case-insensitive) + type', async () => {
      await createMovie(profile.id,     { title: 'Filme Manual' })
      await createMovie(amigoPerfil.id, { title: 'filme manual' })

      const result = await drawMovie([profile.id, amigoPerfil.id])
      expect(result.sources).toHaveLength(2)
    })

    it('item nas duas listas domina o sorteio (soma de pesos × overlap boost)', async () => {
      // Duas cópias MEDIUM (4+4) × boost 4 = 32 vs 4 do item solo → ~89%.
      // Limiar conservador de 70% pra evitar flakiness.
      await createMovie(profile.id,     { title: 'Comum',    externalId: '100' })
      await createMovie(amigoPerfil.id, { title: 'Comum',    externalId: '100' })
      await createMovie(amigoPerfil.id, { title: 'Sozinho',  externalId: '200' })

      let comumCount = 0
      for (let i = 0; i < 100; i++) {
        const r = await drawMovie([profile.id, amigoPerfil.id])
        if (r.movie.title === 'Comum') comumCount++
      }
      expect(comumCount).toBeGreaterThan(70)
    })

    it('overlap desligado remove o boost mas mantém a soma das cópias', async () => {
      await createMovie(profile.id,     { title: 'Comum', externalId: '100' })
      await createMovie(amigoPerfil.id, { title: 'Comum', externalId: '100' })

      const config = {
        priority: { enabled: false, weights: {} },
        age:      { enabled: false, maxBoost: 1, fullMonths: 1 },
        overlap:  { enabled: false, boostPerExtraList: 1 },
      }
      const result = await drawMovie([profile.id, amigoPerfil.id], {}, config)
      expect(result.movie.title).toBe('Comum')
      expect(result.sources).toHaveLength(2)
    })

    it('EMPTY_LIST só quando todas as listas estão vazias', async () => {
      const vazio = await drawMovie([profile.id, amigoPerfil.id])
      expect(vazio.reason).toBe('EMPTY_LIST')

      await createMovie(amigoPerfil.id, { title: 'Único do grupo' })
      const result = await drawMovie([profile.id, amigoPerfil.id])
      expect(result.movie.title).toBe('Único do grupo')
    })
  })
})
