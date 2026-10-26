import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const run = promisify(execFile)

const kawapressPackageDirectory = fileURLToPath(new URL('../..', import.meta.url))
const kawapressBin = join(kawapressPackageDirectory, 'bin/kawapress.mjs')

/** Vite inlines `process.env.NODE_ENV`, so these dev-only markers reveal its value. */
const DEVELOPMENT_ONLY_MARKERS = [
  // vue-router's dev-only route record diagnostics.
  'VUE_ROUTER_R0',
  // Vue's dev-only devtools hook.
  '__VUE_DEVTOOLS_KIT',
]

const CONFIG = `export default {
  title: 'Build Env Test',
}
`

const PAGE = `---
title: Home
---

# Build Env Test
`

let siteDirectory: string

beforeEach(async () => {
  siteDirectory = await mkdtemp(join(tmpdir(), 'kawapress-build-'))
})

afterEach(async () => {
  await rm(siteDirectory, { force: true, recursive: true })
})

/**
 * Writes the smallest site that still loads a config file through Vite's
 * `runnerImport()`, which is the step that used to leave `NODE_ENV` at
 * "development" for the client build. `node_modules/kawapress` is a symlink
 * because the site is not installed, just like a `link:` dependency.
 */
async function createSite(): Promise<void> {
  await writeFile(join(siteDirectory, 'package.json'), JSON.stringify({
    name: 'build-env-test',
    private: true,
    type: 'module',
  }, null, 2))
  await writeFile(join(siteDirectory, 'kawapress.config.ts'), CONFIG)
  await writeFile(join(siteDirectory, 'index.md'), PAGE)
  await mkdir(join(siteDirectory, 'node_modules'), { recursive: true })
  await symlink(
    kawapressPackageDirectory,
    join(siteDirectory, 'node_modules/kawapress'),
    'dir',
  )
}

async function buildWithoutNodeEnv(): Promise<void> {
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.NODE_ENV
  await run(process.execPath, [kawapressBin, 'build'], {
    cwd: siteDirectory,
    env,
  })
}

async function readClientEntryChunk(): Promise<string> {
  const assetsDirectory = join(siteDirectory, 'dist/assets')
  const entryChunk = (await readdir(assetsDirectory))
    .find(file => file.startsWith('entry-client-') && file.endsWith('.js'))
  expect(entryChunk, 'client entry chunk in dist/assets').toBeDefined()
  return readFile(join(assetsDirectory, entryChunk!), 'utf8')
}

describe('buildSite', () => {
  it('ships the production build even when NODE_ENV is unset', async () => {
    await createSite()
    await buildWithoutNodeEnv()

    const chunk = await readClientEntryChunk()

    for (const marker of DEVELOPMENT_ONLY_MARKERS) {
      expect(chunk, `${marker} must be tree-shaken out of the client bundle`)
        .not
        .toContain(marker)
    }
  }, 300_000)
})
