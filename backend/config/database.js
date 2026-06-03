import { PrismaClient } from '@prisma/client'
import { logger } from '../lib/logger.js'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

const connectDB = async () => {
  try {
    await prisma.$connect()
    logger.info('PostgreSQL conectado')
  } catch (error) {
    logger.error({ err: error }, 'Erro ao conectar com PostgreSQL')
    process.exit(1)
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export { prisma }
export default connectDB

