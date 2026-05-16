import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/manual/**/*.test.js'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
})
