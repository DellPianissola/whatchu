import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './config/swagger.js'
import connectDB from './config/database.js'
import { authenticateToken } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import indexRoutes from './routes/index.js'
import authRoutes from './routes/auth.js'
import moviesRoutes from './routes/movies.js'
import profilesRoutes from './routes/profiles.js'
import externalRoutes from './routes/external.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const IS_PROD = process.env.NODE_ENV === 'production'

app.set('trust proxy', 1)

app.use(helmet())

app.use(cors({
  origin: IS_PROD ? process.env.CORS_ORIGIN : '*',
  credentials: true,
}))

app.use(express.json())

// Brute-force protection nas rotas de auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
})

// Limita disparo de email pra destinatários não autenticados (flood/assédio/custo)
const emailDispatchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações. Tente novamente em 15 minutos.' },
})

if (!IS_PROD) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Whatchu API - Documentação',
  }))
}

connectDB()

app.use('/api', indexRoutes)
// Aplicado ANTES do authLimiter pra contar separadamente — a barreira mais apertada vence.
app.use('/api/auth/register', emailDispatchLimiter)
app.use('/api/auth/request-password-reset', emailDispatchLimiter)
app.use('/api/auth/resend-verification-public', emailDispatchLimiter)
app.use('/api/auth', authLimiter, authRoutes)

app.use('/api/movies', authenticateToken, moviesRoutes)
app.use('/api/profiles', authenticateToken, profilesRoutes)
app.use('/api/external', authenticateToken, externalRoutes)

// Último middleware — captura erros propagados pelos handlers
app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 API available at http://localhost:${PORT}/api`)
  if (!IS_PROD) console.log(`📚 Documentation available at http://localhost:${PORT}/docs`)
})
