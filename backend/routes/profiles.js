import express from 'express'
import { prisma } from '../config/database.js'

const router = express.Router()

// GET /api/profiles - Retorna o perfil do usuário autenticado
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            movies: true,
          },
        },
      },
    })

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' })
    }

    res.json({ profile })
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    res.status(500).json({ error: 'Erro ao buscar perfil' })
  }
})

// POST /api/profiles - Cria perfil para o usuário autenticado (se não existir)
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id
    const { name } = req.body

    // Verifica se já existe perfil
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (existingProfile) {
      return res.status(400).json({ error: 'Usuário já possui um perfil' })
    }

    const profile = await prisma.profile.create({
      data: {
        name: name || req.user.username,
        userId,
      },
    })

    res.status(201).json({
      message: 'Perfil criado com sucesso',
      profile,
    })
  } catch (error) {
    console.error('Erro ao criar perfil:', error)
    res.status(500).json({ error: 'Erro ao criar perfil' })
  }
})

// GET /api/profiles/me - Retorna perfil do usuário autenticado com filmes
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        movies: {
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        _count: {
          select: {
            movies: true,
          },
        },
      },
    })

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' })
    }

    res.json({ profile })
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    res.status(500).json({ error: 'Erro ao buscar perfil' })
  }
})

// PUT /api/profiles - Atualiza perfil do usuário autenticado
router.put('/', async (req, res) => {
  try {
    const userId = req.user.id
    const { name } = req.body

    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (!existingProfile) {
      return res.status(404).json({ error: 'Perfil não encontrado' })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name

    const profile = await prisma.profile.update({
      where: { userId },
      data: updateData,
    })

    res.json({
      message: 'Perfil atualizado com sucesso',
      profile,
    })
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    res.status(500).json({ error: 'Erro ao atualizar perfil' })
  }
})

// POST /api/profiles/onboarded - Marca o onboarding como concluído (idempotente)
router.post('/onboarded', async (req, res) => {
  try {
    const userId = req.user.id

    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (!existingProfile) {
      return res.status(404).json({ error: 'Perfil não encontrado' })
    }

    // Idempotente: se já tem onboardedAt, não sobrescreve
    if (existingProfile.onboardedAt) {
      return res.json({
        message: 'Onboarding já estava concluído',
        profile: existingProfile,
      })
    }

    const profile = await prisma.profile.update({
      where: { userId },
      data: { onboardedAt: new Date() },
    })

    res.json({
      message: 'Onboarding concluído',
      profile,
    })
  } catch (error) {
    console.error('Erro ao marcar onboarding:', error)
    res.status(500).json({ error: 'Erro ao marcar onboarding' })
  }
})

export default router

