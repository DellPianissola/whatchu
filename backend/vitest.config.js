import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Testes unitários (lib, middleware, external com mocks).
    // Testes de serviço com DB real ficam em vitest.integration.config.js.
    include: [
      'tests/lib/**/*.test.js',
      'tests/middleware/**/*.test.js',
      'tests/services/external.test.js',
      'tests/services/externalLottery.test.js',
    ],

    // Ambiente Node — não DOM
    environment: 'node',

    // Globals (describe/it/expect) sem precisar importar
    globals: true,

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // O que medir
      include: [
        'lib/**/*.js',
        'middleware/**/*.js',
        'services/**/*.js',
        'routes/**/*.js',
      ],
      // O que ignorar (provider externo + bootstrap + config)
      exclude: [
        'services/tmdb.js',
        'services/jikan.js',
        'config/**',
        'prisma/**',
        '**/*.config.js',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
})
