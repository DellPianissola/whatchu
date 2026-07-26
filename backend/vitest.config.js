import { defineConfig } from 'vitest/config'
import { INTEGRATION_TESTS } from './tests/helpers/integrationTests.js'

export default defineConfig({
  test: {
    // Pega tudo e exclui os que precisam de DB real — arquivo novo entra no unit
    // sozinho, em vez de ficar fora da suíte em silêncio por falta de cadastro.
    // tests/manual/ fica fora: dispara email real quando RESEND_API_KEY existe.
    include: ['tests/**/*.test.js'],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      'tests/manual/**',
      ...INTEGRATION_TESTS,
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
