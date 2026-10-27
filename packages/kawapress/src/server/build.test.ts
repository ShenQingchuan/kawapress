import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const run = promisify(execFile)

const kawapressPackageDirectory = fileURLToPath(new URL('../..', import.meta.url))
const kawapressBin = join(kawapressPackageDirectory, 'bin/kawapress.mjs')

/** Vite inlines `process.env.NODE_ENV`, so these dev-only markers reveal its value. */
const DEVELOPMENT_ONLY_MARKERS = [
  // Vue's dev-only devtools hook.
  '__VUE_DEVTOOLS_KIT',
  // Vue's dev-only warning header; production builds carry no warning code.
  '[Vue warn]',
]

/** A sentence only one page contains, so a chunk can be recognised by it. */
const PAGE_MARKER = 'Only this page mentions the yellow submarine.'

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

${PAGE_MARKER}
`
}

/** A guide page that brings its own stylesheet. */
const STYLED_PAGE = `---
title: Styled
---

# Styled

<div class="styled-probe">styled</div>

<style>
.styled-probe { color: rgb(1, 2, 3); }
</style>
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
  await writeFile(join(siteDirectory, 'index.md'), HOME_PAGE)
  await mkdir(join(siteDirectory, 'guide'), { recursive: true })
  await writeFile(join(siteDirectory, 'guide/one.md'), guidePage('One'))
  await writeFile(join(siteDirectory, 'guide/styled.md'), STYLED_PAGE)
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

/** Every client file below `dist`, relative to it, for example `assets/app-x.js`. */
async function listClientFiles(): Promise<string[]> {
  const entries = await readdir(join(siteDirectory, 'dist/assets'), {
    recursive: true,
    withFileTypes: true,
  })
  const assetsDirectory = join(siteDirectory, 'dist/assets')
  return entries
    .filter(entry => entry.isFile())
    .map(entry => `assets/${relative(assetsDirectory, join(entry.parentPath, entry.name)).replaceAll('\\', '/')}`)
    .sort()
}

async function readClientFile(file: string): Promise<string> {
  return readFile(join(siteDirectory, 'dist', file), 'utf8')
}

/** The one client file whose path starts with `prefix`, for example `assets/app-`. */
async function findClientFile(prefix: string): Promise<string> {
  const file = (await listClientFiles()).find(candidate => candidate.startsWith(prefix))
  expect(file, `client file ${prefix}* in dist`).toBeDefined()
  return file!
}

async function readPageTable(): Promise<Record<string, string | [string, string[], string[]]>> {
  const table = await findClientFile('assets/pages-')
  const source = await readClientFile(table)
  const json = source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1)
  return JSON.parse(json) as Record<string, string | [string, string[], string[]]>
}

/** Page chunk file of a table entry, narrowed out of its tuple form. */
function pageChunkOf(
  entry: string | [string, string[], string[]],
): string {
  return typeof entry === 'string' ? entry : entry[0]
}

describe('buildSite', () => {
  it('ships the production build even when NODE_ENV is unset', async () => {
    await createSite()
    await buildWithoutNodeEnv()

    const chunks = await Promise.all((await listClientFiles()).map(readClientFile))

    for (const marker of DEVELOPMENT_ONLY_MARKERS) {
      for (const [index, chunk] of chunks.entries()) {
        expect(chunk, `${marker} must be tree-shaken out of client chunk ${index}`)
          .not
          .toContain(marker)
      }
    }
  }, 300_000)

  it('keeps page code out of the app chunk', async () => {
    await createSite()
    await buildWithoutNodeEnv()

    const table = await readPageTable()
    const app = await readClientFile(await findClientFile('assets/app-'))
    const page = await readClientFile(pageChunkOf(table['/guide/one']!))

    expect(page, 'the page chunk has to carry the page').toContain(PAGE_MARKER)
    expect(app, 'the app chunk must not carry any page').not.toContain(PAGE_MARKER)
  }, 300_000)

  it('records one file name per page and the page CSS of a styled page', async () => {
    await createSite()
    await buildWithoutNodeEnv()

    const table = await readPageTable()

    expect(Object.keys(table).sort()).toEqual(['/', '/guide/one', '/guide/styled'])
    const plain = table['/guide/one']!
    expect(pageChunkOf(plain)).toMatch(/^assets\/pages\/guide\/one-[\w-]+\.js$/)
    // A page names its own chunk and only the chunks no page can get from the
    // entry: here the Vue SFC helper every page imports, and no stylesheet.
    const [, plainJs, plainCss] = plain as [string, string[], string[]]
    expect(plainJs.every(file => file.includes('_plugin-vue_export-helper'))).toBe(true)
    expect(plainCss).toEqual([])

    const styled = table['/guide/styled']
    expect(Array.isArray(styled), 'a styled page records its CSS').toBe(true)
    const [, extraJs, css] = styled as [string, string[], string[]]
    expect(css).toHaveLength(1)
    expect(css[0]).toMatch(/^assets\/(?:[^-\n\r\u2028\u2029]*-[^-\w\n\r\u2028\u2029])*[^-\n\r\u2028\u2029]*-[-\w]+(?:[^-\w\n\r\u2028\u2029](?:[^-\n\r\u2028\u2029]*-[^-\w\n\r\u2028\u2029])*[^-\n\r\u2028\u2029]*-[-\w]+)*\.css$/)
    expect(extraJs.every(file => file.endsWith('.js'))).toBe(true)
    // The stylesheet the table names is really part of the build output.
    expect(await listClientFiles()).toContain(css[0])
  }, 300_000)

  it('ships no preload dependency table', async () => {
    await createSite()
    await buildWithoutNodeEnv()

    for (const file of (await listClientFiles()).filter(name => name.endsWith('.js'))) {
      expect(await readClientFile(file), `${file} must not list preload dependencies`)
        .not
        .toContain('__vite__mapDeps')
    }
  }, 300_000)

  it('keeps the app and the entry cached when only a page changes', async () => {
    await createSite()
    await buildWithoutNodeEnv()
    const before = {
      app: await findClientFile('assets/app-'),
      entry: await findClientFile('assets/entry-client-'),
      table: await findClientFile('assets/pages-'),
      page: pageChunkOf((await readPageTable())['/guide/one']!),
    }

    await writeFile(join(siteDirectory, 'guide/one.md'), guidePage('One Renamed'))
    await buildWithoutNodeEnv()
    const after = {
      app: await findClientFile('assets/app-'),
      entry: await findClientFile('assets/entry-client-'),
      table: await findClientFile('assets/pages-'),
      page: pageChunkOf((await readPageTable())['/guide/one']!),
    }

    // The page chunk carries the new title and the table names that new chunk,
    // so both change. The app chunk holds framework and theme code and the entry
    // only names the app chunk, so neither may move.
    expect(after.page).not.toBe(before.page)
    expect(after.table).not.toBe(before.table)
    expect(after.app).toBe(before.app)
    expect(after.entry).toBe(before.entry)
  }, 300_000)

  it('points every prerendered page at the page table', async () => {
    await createSite()
    await buildWithoutNodeEnv()

    const table = (await findClientFile('assets/pages-')).replace('assets/', '')
    for (const htmlFile of ['index.html', 'guide/one.html', 'guide/styled.html', '404.html']) {
      const html = await readFile(join(siteDirectory, 'dist', htmlFile), 'utf8')
      expect(html, `${htmlFile} must preload ${table}`).toContain(
        `<link rel="modulepreload" href="/assets/${table}">`,
      )
      expect(html, `${htmlFile} must tell the client where the table is`).toContain(
        `<meta name="kawapress-pages" content="/assets/${table}">`,
      )
    }
  }, 300_000)
})
