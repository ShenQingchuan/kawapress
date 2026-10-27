import process from 'node:process'
import { defineConfig } from '@playwright/test'
import {
  devOrigin,
  pluginsOrigin,
  pluginsPort,
  previewOrigin,
  previewPort,
  sitePath,
} from './support/site'

/**
 * The main suite runs against the production build served by `kawapress
 * preview`; a small smoke suite runs against `kawapress dev`. Both read
 * `KAWAPRESS_BASE`, so the same specs pass with and without a site base.
 *
 * Every server also gets `KAWAPRESS_E2E=1`, which keeps Vue's hydration
 * mismatch details in the built bundles so the console guard can see them.
 * `NODE_ENV` is pinned per server instead of being inherited: a shell that
 * exports `NODE_ENV=production` would otherwise make `kawapress dev` start in
 * production mode and hide the very warnings the suite looks for.
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  timeout: 30_000,
  // The production build and the dev server run side by side: the main suite
  // needs the build, the dev smoke suite needs the dev server.
  webServer: [
    {
      command: `pnpm --dir ../docs build && pnpm --dir ../docs preview --port ${previewPort}`,
      url: `${previewOrigin}${sitePath('/')}`,
      // The build runs before the preview server starts.
      timeout: 180_000,
      // Always start a fresh server: a leftover server may serve another
      // checkout or another base.
      reuseExistingServer: false,
      stderr: 'pipe',
      env: {
        KAWAPRESS_E2E: '1',
        NODE_ENV: 'production',
      },
    },
    {
      // `kawapress dev` always listens on its default port.
      //
      // The dependency optimizer cache is removed first: the dev smoke suite has
      // to see the cold start every time, because a stale cache hides the reload
      // that a lazily imported dependency causes on a first visit.
      command: 'rm -rf ../docs/node_modules/.vite && pnpm --dir ../docs dev',
      // A public asset is served by Vite itself, so it stays reachable even
      // while the page requests are still being inspected.
      url: `${devOrigin}${sitePath('/kawapress-logo.png')}`,
      timeout: 120_000,
      reuseExistingServer: false,
      stderr: 'pipe',
      env: {
        KAWAPRESS_E2E: '1',
        NODE_ENV: 'development',
      },
    },
    {
      // Plugins that the docs site does not enable get their own small site.
      command: `pnpm --dir ./fixtures/plugins-site build && pnpm --dir ./fixtures/plugins-site preview --port ${pluginsPort}`,
      url: `${pluginsOrigin}${sitePath('/')}`,
      timeout: 180_000,
      reuseExistingServer: false,
      stderr: 'pipe',
      env: {
        KAWAPRESS_E2E: '1',
        NODE_ENV: 'production',
      },
    },
  ],
  use: {
    // The code copy spec reads the clipboard back from the page.
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'preview',
      use: { baseURL: previewOrigin },
      testIgnore: [/dev-smoke\.spec\.ts/, /comments\.spec\.ts/],
    },
    {
      name: 'dev-smoke',
      use: { baseURL: devOrigin },
      testMatch: /dev-smoke\.spec\.ts/,
    },
    {
      name: 'plugins-site',
      use: { baseURL: pluginsOrigin },
      testMatch: /comments\.spec\.ts/,
    },
  ],
})
