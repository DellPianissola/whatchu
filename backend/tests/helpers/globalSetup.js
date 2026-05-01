/**
 * globalSetup do Vitest para testes de integração.
 *
 * Roda no processo PRINCIPAL (não no worker) antes de qualquer teste.
 * Pré-requisito: postgres-test deve estar de pé antes de rodar os testes.
 *   docker compose --profile test up postgres-test -d
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const BACKEND_ROOT = path.resolve(__dirname, '..', '..')

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://whatchu:whatchu@localhost:5433/whatchu_test'

export async function setup() {
  console.log('\n⏳ Sincronizando schema Prisma no banco de testes...')
  // Usa db push porque o projeto ainda não tem migration files.
  // Quando migrations forem criadas, trocar por: prisma migrate deploy
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  })
  console.log('✅ Banco de testes pronto\n')
}
