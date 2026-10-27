import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/** Stand-in for the site virtual modules; see the file itself. */
const virtualModuleStub = fileURLToPath(
  new URL('./packages/kawapress/src/client/testing/virtual-modules.ts', import.meta.url),
)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'virtual:kawapress-site': virtualModuleStub,
      'virtual:kawapress-pages': virtualModuleStub,
      'virtual:kawapress-runtime-plugins': virtualModuleStub,
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'bench/src/**/*.test.ts', 'scripts/**/*.test.ts'],
    testTimeout: 30_000,
    // Node 25+ exposes an empty global localStorage that shadows happy-dom's.
    execArgv: ['--no-experimental-webstorage'],
  },
})
