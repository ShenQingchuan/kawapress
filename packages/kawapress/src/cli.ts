import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import { version } from '../package.json'

const dev = defineCommand({
  meta: { name: 'dev', description: 'Start the dev server' },
  async run() {
    const startedAt = performance.now()
    const [{ logDevServerReady }, { createDevServer }] = await Promise.all([
      import('./cli/dev-output'),
      import('./server/dev'),
    ])
    const server = await createDevServer(process.cwd())
    logDevServerReady({
      durationMs: performance.now() - startedAt,
      port: server.port,
    })
  },
})

const build = defineCommand({
  meta: { name: 'build', description: 'Build the static site' },
  async run() {
    const { buildSite } = await import('./server/build')
    await buildSite(process.cwd())
  },
})

const preview = defineCommand({
  meta: { name: 'preview', description: 'Preview the built site' },
  async run() {
    const { previewSite } = await import('./server/preview')
    await previewSite(process.cwd())
  },
})

export const main = defineCommand({
  meta: {
    name: 'kawapress',
    version,
    description: 'Static site generator powered by Vue & Vite.',
  },
  subCommands: {
    dev,
    build,
    preview,
  },
})

runMain(main)
