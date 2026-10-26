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

const HOME_PAGE = `---
title: Home
---

# Build Env Test
`

/** A guide page whose title the chunk test edits between two builds. */
function guidePage(title: string): string {
  return `---
title: ${title}
---

# ${title}
`
}

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
  await writeFile(join(siteDirectory, 'index.md'), HOME_PAGE)
  await mkdir(join(siteDirectory, 'guide'), { recursive: true })
  await writeFile(join(siteDirectory, 'guide/one.md'), guidePage('One'))
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

async function listClientChunks(): Promise<string[]> {
  return (await readdir(join(siteDirectory, 'dist/assets')))
    .filter(file => file.endsWith('.js'))
    .sort()
}

async function readClientChunks(): Promise<string[]> {
  const assetsDirectory = join(siteDirectory, 'dist/assets')
  return Promise.all((await listClientChunks()).map(
    file => readFile(join(assetsDirectory, file), 'utf8'),
  ))
}

describe('buildSite', () => {
  it('ships the production build even when NODE_ENV is unset', async () => {
    await createSite()
    await buildWithoutNodeEnv()

    const chunks = await readClientChunks()

    for (const marker of DEVELOPMENT_ONLY_MARKERS) {
      for (const [index, chunk] of chunks.entries()) {
        expect(chunk, `${marker} must be tree-shaken out of client chunk ${index}`)
          .not
          .toContain(marker)
      }
    }
  }, 300_000)
})
