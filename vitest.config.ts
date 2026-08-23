import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['source'],
  },
  test: {
    include: ['packages/**/*.test.ts'],
  },
})
