import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authLimiter, emailDispatchLimiter } from '../config/rateLimits.js'
import * as authService from '../services/auth.js'

const router = express.Router()

router.post('/register', emailDispatchLimiter, authLimiter, asyncHandler(async (req, res) => {
  await authService.registerUser(req.body)
  res.status(202).json({
    message: 'Cadastro recebido. Verifique seu email para concluir.',
    pending: true,
  })
}))

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body)
  res.json({ message: 'Login realizado com sucesso', ...result })
}))

// Sem authLimiter — chamado em todo mount do AuthContext.
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id)
  res.json({ user })
}))

router.post('/refresh', authLimiter, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  const tokens = await authService.refreshTokens(refreshToken)
  res.json(tokens)
}))

// POST (não GET) pra não ser consumido por scanners de email / pré-fetch.
router.post('/verify-email', authLimiter, asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token)
  res.json({ message: 'Email verificado com sucesso', ...result })
}))

router.post('/resend-verification-public', emailDispatchLimiter, asyncHandler(async (req, res) => {
  await authService.resendVerificationEmailByEmail(req.body.email)
  res.json({ message: 'Se houver um cadastro pendente com este email, um novo link foi enviado' })
}))

router.post('/request-password-reset', emailDispatchLimiter, asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email)
  res.json({ message: 'Se o email estiver cadastrado, você receberá as instruções em breve' })
}))

router.post('/reset-password', authLimiter, asyncHandler(async (req, res) => {
  const { token, password } = req.body
  await authService.resetPassword(token, password)
  res.json({ message: 'Senha redefinida com sucesso' })
}))

export default router
