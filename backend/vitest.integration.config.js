import { defineConfig } from 'vitest/config'

// URL do banco de testes (postgres-test do docker-compose --profile test)
const TEST_DATABASE_URL =
  'postgresql://whatwatchnext:whatwatchnext@localhost:5433/whatwatchnext_test'

export default defineConfig({
  test: {
    // Só os testes de serviço que precisam de banco real
    include: [
      'tests/services/lottery.test.js',
      'tests/services/profiles.test.js',
      'tests/services/auth.test.js',
      'tests/services/movies.test.js',
    ],

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
        'services/lottery.js',
        'services/profiles.js',
        'services/auth.js',
        'services/movies.js',
      ],
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
    },
  },
})
