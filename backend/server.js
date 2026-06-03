import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import pinoHttp from 'pino-http'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './config/swagger.js'
import connectDB from './config/database.js'
import { logger } from './lib/logger.js'
import { authenticateToken } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import indexRoutes from './routes/index.js'
import authRoutes from './routes/auth.js'
import moviesRoutes from './routes/movies.js'
import profilesRoutes from './routes/profiles.js'
import externalRoutes from './routes/external.js'

dotenv.config()

const app = express()
const PORT        = process.env.PORT || 5000
const IS_PROD     = process.env.NODE_ENV === 'production'
const TRUST_PROXY = process.env.TRUST_PROXY ?? '1'
const JSON_LIMIT  = process.env.JSON_BODY_LIMIT || '100kb'

if (IS_PROD && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN é obrigatório em produção')
}

app.set('trust proxy', /^\d+$/.test(TRUST_PROXY) ? parseInt(TRUST_PROXY, 10) : TRUST_PROXY)

app.use(helmet({
  contentSecurityPolicy: IS_PROD ? undefined : false,
  hsts: IS_PROD ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
}))

app.use(cors({
  origin: IS_PROD ? process.env.CORS_ORIGIN : '*',
  credentials: true,
}))

app.use(pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  autoLogging: { ignore: (req) => req.url === '/api/health' },
}))

app.use(express.json({ limit: JSON_LIMIT }))

if (!IS_PROD) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Whatchu API - Documentação',
  }))
}

connectDB()

app.use('/api', indexRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/movies', authenticateToken, moviesRoutes)
app.use('/api/profiles', authenticateToken, profilesRoutes)
app.use('/api/external', externalRoutes)

app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`)
  if (!IS_PROD) logger.info(`Docs available at http://localhost:${PORT}/docs`)
})
