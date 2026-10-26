import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['packages/**/*.test.ts', 'bench/src/**/*.test.ts'],
    testTimeout: 30_000,
    // Node 25+ exposes an empty global localStorage that shadows happy-dom's.
    execArgv: ['--no-experimental-webstorage'],
  },
})
