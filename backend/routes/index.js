import express from 'express'
import { APP_VERSION } from '../lib/version.js'

const router = express.Router()

// Health check + versão da API (consumido pelo Footer no frontend)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Whatchu API is running', version: APP_VERSION })
})

export default router
