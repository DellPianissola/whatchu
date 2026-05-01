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
    const result = await drawMovie(profile.id, { types: ['ANIME'] })
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
})
