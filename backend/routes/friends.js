import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { friendInviteLimiter, movieWriteLimiter } from '../config/rateLimits.js'
import * as friendsService from '../services/friends.js'

const router = express.Router()

// GET /api/friends - Amigos aceitos + convites pendentes (enviados e recebidos)
router.get('/', asyncHandler(async (req, res) => {
  const result = await friendsService.listFriends(req.user.id)
  res.json(result)
}))

// POST /api/friends/invites - Envia convite de amizade por username
router.post('/invites', friendInviteLimiter, asyncHandler(async (req, res) => {
  const invite = await friendsService.sendInvite(req.user.id, req.body || {})
  res.status(201).json({ message: 'Convite enviado', invite })
}))

// POST /api/friends/invites/:id/respond - Aceita ou recusa convite recebido
router.post('/invites/:id/respond', movieWriteLimiter, asyncHandler(async (req, res) => {
  const friendship = await friendsService.respondInvite(req.user.id, req.params.id, req.body?.accept)
  res.json(friendship
    ? { message: 'Convite aceito', friendship }
    : { message: 'Convite recusado' })
}))

// DELETE /api/friends/:id - Desfaz amizade ou cancela convite enviado
router.delete('/:id', movieWriteLimiter, asyncHandler(async (req, res) => {
  await friendsService.removeFriendship(req.user.id, req.params.id)
  res.json({ message: 'Amizade removida' })
}))

export default router
