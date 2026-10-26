import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const run = promisify(execFile)

const scaffolderBin = fileURLToPath(new URL('../bin/create-kawapress.mjs', import.meta.url))
const kawapressPackageDirectory = fileURLToPath(new URL('../../kawapress', import.meta.url))
const kawapressBin = join(kawapressPackageDirectory, 'bin/kawapress.mjs')

let workspace: string

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'create-kawapress-integration-'))
})

afterEach(async () => {
  await rm(workspace, { force: true, recursive: true })
})

/**
 * Runs the scaffolder the way a user does, then replaces the published version
 * range with a link to the workspace package so the test never touches the
 * network. `link:` is the specifier pnpm installs as a symlink, and pointing
 * `node_modules/kawapress` at the package is what that install produces.
 */
async function scaffold(directoryName: string, args: string[]): Promise<string> {
  const siteDirectory = join(workspace, directoryName)

  await run(process.execPath, [scaffolderBin, siteDirectory, '--yes', '--no-install', ...args], {
    cwd: workspace,
  })

  const manifestPath = join(siteDirectory, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.devDependencies.kawapress = `link:${kawapressPackageDirectory}`
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  await mkdir(join(siteDirectory, 'node_modules'), { recursive: true })
  await symlink(kawapressPackageDirectory, join(siteDirectory, 'node_modules', 'kawapress'), 'dir')

  return siteDirectory
}

async function build(siteDirectory: string): Promise<void> {
  await run(process.execPath, [kawapressBin, 'build'], { cwd: siteDirectory })
}

describe('create-kawapress integration', () => {
  it('generates a site that builds into static HTML', async () => {
    const siteDirectory = await scaffold('my-site', ['--title', 'My Docs'])

    await build(siteDirectory)

    expect(existsSync(join(siteDirectory, 'dist/index.html'))).toBe(true)
    expect(existsSync(join(siteDirectory, 'dist/guide/getting-started.html'))).toBe(true)
  }, 180_000)

  it('generates both languages of a two-language site', async () => {
    const siteDirectory = await scaffold('two-languages', [
      '--title',
      'Two Languages',
      '--lang',
      'en',
      '--second-lang',
      'zh-CN',
    ])

    await build(siteDirectory)

    expect(existsSync(join(siteDirectory, 'dist/index.html'))).toBe(true)
    expect(existsSync(join(siteDirectory, 'dist/guide/getting-started.html'))).toBe(true)
    // `/zh` is the locale home route, so file routing writes `zh.html`.
    expect(existsSync(join(siteDirectory, 'dist/zh.html'))).toBe(true)
    expect(existsSync(join(siteDirectory, 'dist/zh/guide/getting-started.html'))).toBe(true)
  }, 180_000)
})
