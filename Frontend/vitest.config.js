import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    include: ['tests/**/*.test.jsx'],
    setupFiles: ['./tests/setupAct.js', './tests/setupSmoke.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
