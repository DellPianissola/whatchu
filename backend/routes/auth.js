import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as authService from '../services/auth.js'

const router = express.Router()

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body)
  res.status(201).json({ message: 'Usuário criado com sucesso', ...result })
}))

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body)
  res.json({ message: 'Login realizado com sucesso', ...result })
}))

// GET /api/auth/me
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id)
  res.json({ user })
}))

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  const tokens = await authService.refreshTokens(refreshToken)
  res.json(tokens)
}))

// GET /api/auth/verify-email?token=
router.get('/verify-email', asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.query.token)
  res.json({ message: 'Email verificado com sucesso' })
}))

// POST /api/auth/resend-verification
router.post('/resend-verification', authenticateToken, asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.user.id)
  res.json({ message: 'Email de verificação reenviado' })
}))

// POST /api/auth/resend-verification-public
// Versão sem auth — usada quando o link expirou e o usuário não consegue logar.
// Anti-enumeração: resposta sempre genérica, mesmo se o email não existe ou já está verificado.
router.post('/resend-verification-public', asyncHandler(async (req, res) => {
  await authService.resendVerificationEmailByEmail(req.body.email)
  res.json({ message: 'Se o email estiver cadastrado e ainda não verificado, você receberá um novo link em breve' })
}))

// POST /api/auth/request-password-reset
router.post('/request-password-reset', asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email)
  // Resposta genérica independente de o email existir (anti-enumeração)
  res.json({ message: 'Se o email estiver cadastrado e verificado, você receberá as instruções em breve' })
}))

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body
  await authService.resetPassword(token, password)
  res.json({ message: 'Senha redefinida com sucesso' })
}))

export default router
