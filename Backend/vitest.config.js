import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/setupTests.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})

