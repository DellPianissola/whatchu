import express from 'express'
import multer from 'multer'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as profilesService from '../services/profiles.js'
import { uploadAvatar } from '../services/storage.js'

const router = express.Router()

// multer com armazenamento em memória — o buffer é passado direto pro MinIO
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB (validação final fica no service)
})

// GET /api/profiles - Retorna o perfil do usuário autenticado
router.get('/', asyncHandler(async (req, res) => {
  const profile = await profilesService.getProfile(req.user.id)
  res.json({ profile })
}))

// POST /api/profiles - Cria perfil para o usuário autenticado (se não existir)
router.post('/', asyncHandler(async (req, res) => {
  const profile = await profilesService.createProfile(req.user.id, req.user.username, req.body)
  res.status(201).json({ message: 'Perfil criado com sucesso', profile })
}))

// GET /api/profiles/me - Retorna perfil do usuário autenticado com filmes
router.get('/me', asyncHandler(async (req, res) => {
  const profile = await profilesService.getProfileWithMovies(req.user.id)
  res.json({ profile })
}))

// PUT /api/profiles - Atualiza perfil do usuário autenticado
router.put('/', asyncHandler(async (req, res) => {
  const profile = await profilesService.updateProfile(req.user.id, req.body)
  res.json({ message: 'Perfil atualizado com sucesso', profile })
}))

// POST /api/profiles/onboarded - Marca o onboarding como concluído (idempotente)
router.post('/onboarded', asyncHandler(async (req, res) => {
  const { profile, alreadyCompleted } = await profilesService.markOnboarded(req.user.id)
  res.json({
    message: alreadyCompleted ? 'Onboarding já estava concluído' : 'Onboarding concluído',
    profile,
  })
}))

router.put('/email', asyncHandler(async (req, res) => {
  await profilesService.changeEmail(req.user.id, {
    newEmail:        req.body.newEmail ?? req.body.email,
    currentPassword: req.body.currentPassword,
  })
  res.json({ message: 'Confirme a troca pelo link enviado ao novo endereço.' })
}))

// PUT /api/profiles/avatar - Upload de foto de perfil
router.put('/avatar', upload.single('avatar'), asyncHandler(async (req, res) => {
  const profile = await uploadAvatar(req.user.id, req.file?.buffer, req.file?.mimetype)
  res.json({ message: 'Avatar atualizado', profile })
}))

export default router
