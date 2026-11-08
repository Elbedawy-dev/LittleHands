import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/setupTests.js'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: {
      MONGOMS_SYSTEM_BINARY: 'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    },
  },
})

