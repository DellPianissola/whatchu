import express from 'express'
import cors from 'cors'
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

// Middleware
app.use(cors())
app.use(express.json())

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Whatchu API - Documentação',
}))

// Connect to PostgreSQL
connectDB()

// Public Routes (não requerem autenticação)
app.use('/api', indexRoutes)
app.use('/api/auth', authRoutes)

// Protected Routes (requerem autenticação)
app.use('/api/movies', authenticateToken, moviesRoutes)
app.use('/api/profiles', authenticateToken, profilesRoutes)
app.use('/api/external', authenticateToken, externalRoutes)

// Middleware central de erros — DEVE ser o último middleware registrado.
app.use(errorHandler)

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 API available at http://localhost:${PORT}/api`)
  console.log(`📚 Documentation available at http://localhost:${PORT}/docs`)
})

