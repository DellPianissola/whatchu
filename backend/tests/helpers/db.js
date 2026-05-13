/**
 * Helpers de banco para testes de integração.
 *
 * Re-exporta o mesmo `prisma` que os services usam (singleton de módulo ESM),
 * evitando uma segunda conexão desnecessária.
 *
 * `truncateAll()` limpa todas as tabelas em ordem segura (FK) antes de cada
 * teste para garantir isolamento sem precisar recriar o schema a cada vez.
 */
import { prisma } from '../../config/database.js'

export { prisma }

export const truncateAll = () =>
  prisma.$executeRawUnsafe(
    'TRUNCATE TABLE movies, profiles, users, pending_registrations, verification_tokens RESTART IDENTITY CASCADE'
  )
