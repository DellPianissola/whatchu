import { defineConfig } from 'vitest/config'
import { INTEGRATION_TESTS } from './tests/helpers/integrationTests.js'

// URL do banco de testes. Default aponta pro postgres-test exposto em localhost:5433
// (workflow dev do host). Quando rodando dentro da network do docker compose,
// o service backend-test sobrescreve via env TEST_DATABASE_URL apontando pra
// postgres-test:5432.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://whatchu:whatchu@localhost:5433/whatchu_test'

export default defineConfig({
  test: {
    include: INTEGRATION_TESTS,

    environment: 'node',
    globals: true,

    // globalSetup: aplica migrations antes de qualquer teste
    globalSetup: ['tests/helpers/globalSetup.js'],

    // Roda todos os arquivos num único fork para serializar acesso ao banco.
    // maxWorkers: 1 garante que não há dois arquivos de teste tocando o DB ao mesmo tempo.
    pool: 'forks',
    maxWorkers: 1,

    // Injeta DATABASE_URL + JWT_SECRET nos workers antes de qualquer import
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'vitest-test-secret-nao-usar-em-producao',
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'services/lottery/**',
        'services/profiles.js',
        'services/auth.js',
        'services/movies.js',
        'services/storage.js',
        'services/friends.js',
      ],
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
    },
  },
})
