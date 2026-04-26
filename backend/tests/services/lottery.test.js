import { describe, it, expect, beforeEach } from 'vitest'
import { drawMovie } from '../../services/lottery.js'
import { truncateAll } from '../helpers/db.js'
import { createUser, createProfile, createMovie } from '../helpers/factories.js'

describe('lottery: drawMovie', () => {
  let profile

  beforeEach(async () => {
    await truncateAll()
    const user = await createUser()
    profile    = await createProfile(user.id)
  })

  it('devolve null quando a lista está vazia', async () => {
    const result = await drawMovie(profile.id)
    expect(result).toBeNull()
  })

  it('devolve o único item quando há apenas um filme', async () => {
    const movie  = await createMovie(profile.id, { title: 'Único' })
    const result = await drawMovie(profile.id)
    expect(result.id).toBe(movie.id)
  })

  it('devolve um dos filmes quando há múltiplos', async () => {
    await createMovie(profile.id, { title: 'A' })
    await createMovie(profile.id, { title: 'B' })
    await createMovie(profile.id, { title: 'C' })
    const result = await drawMovie(profile.id)
    expect(['A', 'B', 'C']).toContain(result.title)
  })

  it('inclui filmes assistidos no sorteio', async () => {
    // Regra: considera TODOS os filmes, assistidos ou não
    const movie  = await createMovie(profile.id, { title: 'Assistido', watched: true })
    const result = await drawMovie(profile.id)
    expect(result.id).toBe(movie.id)
  })

  it('favorece filmes URGENT no pool ponderado', async () => {
    // URGENT tem peso 10, LOW tem peso 1 → ~91% de chance para URGENT
    // Usamos limiar conservador de 70% pra evitar flakiness
    await createMovie(profile.id, { title: 'URGENT', priority: 'URGENT' })
    await createMovie(profile.id, { title: 'LOW',    priority: 'LOW'    })

    let urgentCount = 0
    for (let i = 0; i < 100; i++) {
      const r = await drawMovie(profile.id)
      if (r.title === 'URGENT') urgentCount++
    }
    expect(urgentCount).toBeGreaterThan(70)
  })

  it('devolve o filme com addedBy populado', async () => {
    await createMovie(profile.id, { title: 'Com Relação' })
    const result = await drawMovie(profile.id)
    expect(result.addedBy).toBeDefined()
    expect(result.addedBy.id).toBe(profile.id)
  })
})
