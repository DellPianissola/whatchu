import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

vi.mock('../../services/friends.js', () => ({
  listFriends: vi.fn(),
  sendInvite: vi.fn(),
  respondInvite: vi.fn(),
  removeFriendship: vi.fn(),
}))

import friendsRoutes from '../../routes/friends.js'
import { errorHandler } from '../../middleware/errorHandler.js'
import * as friendsService from '../../services/friends.js'

const buildApp = (userId) => {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => { req.user = { id: userId }; next() })
  app.use('/api/friends', friendsRoutes)
  app.use(errorHandler)
  return app
}

beforeEach(() => vi.clearAllMocks())

describe('rate limit de convites em /api/friends', () => {
  it('bloqueia com 429 após exceder o limite de convites por usuário', async () => {
    friendsService.sendInvite.mockResolvedValue({ id: '1', status: 'PENDING' })
    const app = buildApp('rl-friend-a')

    let last
    for (let i = 0; i < 10; i++) {
      last = await request(app).post('/api/friends/invites').send({ username: 'x' })
    }
    expect(last.status).toBe(201)

    const blocked = await request(app).post('/api/friends/invites').send({ username: 'x' })
    expect(blocked.status).toBe(429)
  })

  it('isola o limite por usuário (key = user.id)', async () => {
    friendsService.sendInvite.mockResolvedValue({ id: '1', status: 'PENDING' })
    const app = buildApp('rl-friend-b')

    const res = await request(app).post('/api/friends/invites').send({ username: 'x' })
    expect(res.status).toBe(201)
  })

  it('não limita a listagem (GET /)', async () => {
    friendsService.listFriends.mockResolvedValue({ friends: [], pendingReceived: [], pendingSent: [] })
    const app = buildApp('rl-friend-c')

    for (let i = 0; i < 15; i++) {
      const res = await request(app).get('/api/friends')
      expect(res.status).toBe(200)
    }
  })
})
