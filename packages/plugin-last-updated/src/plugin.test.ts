import type {
  GeneratorPluginAPI,
  GeneratorPluginHandler,
  PageData,
  PageDataContext,
  PageDataHandler,
} from 'kawapress'
import type { UserConfig } from 'vite'
import type { LastUpdatedPageData, LastUpdatedPluginOptions } from './index'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lastUpdatedPlugin } from './index'

const COMMIT_DATE = '2024-05-06T07:08:09Z'
const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))
const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

describe('last updated plugin', () => {
  it('dates a page from its last commit and links to its source in the repository', async () => {
    const root = await createRepositorySite()
    await commit(root, 'guide.md', '# Guide\n')

    const page = await readPage(root, '/guide', {
      editLink: { pattern: 'https://github.com/o/r/edit/main/:path' },
    })

    expect(page).toMatchObject({
      lastUpdated: Date.parse(COMMIT_DATE),
      editLink: 'https://github.com/o/r/edit/main/guide.md',
    })
  })

  it('dates a page in a nested source directory by its repository path', async () => {
    const root = await createRepositorySite()
    await commit(root, 'docs/guide.md', '# Guide\n')

    const page = await readPage(root, '/guide', {
      editLink: { pattern: 'https://github.com/o/r/edit/main/:path' },
    }, 'docs/guide.md')

    expect(page.editLink).toBe('https://github.com/o/r/edit/main/docs/guide.md')
    expect(page.lastUpdated).toBe(Date.parse(COMMIT_DATE))
  })

  it('leaves the date out for a file git does not know yet', async () => {
    const root = await createRepositorySite()
    await commit(root, 'guide.md', '# Guide\n')
    await writeFile(join(root, 'new.md'), '# New\n')

    const page = await readPage(root, '/new')

    expect(page.lastUpdated).toBeUndefined()
  })

  it('leaves the edit link out when the option is not set', async () => {
    const root = await createRepositorySite()
    await commit(root, 'guide.md', '# Guide\n')

    const page = await readPage(root, '/guide')

    expect(page.lastUpdated).toBe(Date.parse(COMMIT_DATE))
    expect(page.editLink).toBeUndefined()
  })

  it('skips both fields outside a git repository and says why', async () => {
    const warn = vi.spyOn(consola, 'warn')
    const root = await createPlainDirectory()
    await writeFile(join(root, 'guide.md'), '# Guide\n')

    const page = await readPage(root, '/guide', {
      editLink: { pattern: 'https://github.com/o/r/edit/main/:path' },
    })

    expect(page.lastUpdated).toBeUndefined()
    expect(page.editLink).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('the last updated time is skipped'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('the edit link is skipped'))
  })

  it('rejects an edit link pattern without the placeholder', () => {
    expect(() => lastUpdatedPlugin({ editLink: { pattern: 'https://github.com/o/r' } }))
      .toThrow(/editLink\.pattern.*:path/s)
  })

  it('adds the runtime options module to the Vite config', async () => {
    const handlers = await createHandlers()
    const config: UserConfig = {}

    await handlers.vite(config)

    expect(config.plugins).toHaveLength(1)
    expect(config.plugins?.[0]).toMatchObject({ name: 'kawapress:last-updated-options' })
  })
})

interface PluginHandlers {
  pageData: (pageData: PageData, context: PageDataContext) => Promise<void>
  vite: (config: UserConfig) => Promise<void>
}

async function createHandlers(
  options: LastUpdatedPluginOptions = {},
): Promise<PluginHandlers> {
  let pageDataHandler: PageDataHandler | undefined
  let viteHandler: GeneratorPluginHandler<UserConfig> | undefined

  const api: GeneratorPluginAPI = {
    config() {},
    markdown() {},
    pageData(handler) {
      pageDataHandler = handler
    },
    pageArtifact() {},
    vite(handler) {
      viteHandler = handler
    },
    buildArtifacts() {},
  }
  await lastUpdatedPlugin(options).setup(api)

  return {
    async pageData(pageData, context) {
      await pageDataHandler?.(pageData, context)
    },
    async vite(config) {
      await viteHandler?.(config)
    },
  }
}

async function readPage(
  root: string,
  path: string,
  options: LastUpdatedPluginOptions = {},
  sourceFile = `${path.slice(1)}.md`,
): Promise<LastUpdatedPageData> {
  const handlers = await createHandlers(options)
  await handlers.vite({ root })

  const pageData: LastUpdatedPageData = {
    path,
    title: 'Guide',
    frontmatter: {},
    headers: [],
  }
  await handlers.pageData(pageData, {
    file: join(root, sourceFile),
    sourcePath: `/${sourceFile}`,
  })
  return pageData
}

async function createRepositorySite(): Promise<string> {
  const directory = await createTemporaryDirectory(PACKAGE_ROOT)
  execFileSync('git', ['init', '-q'], { cwd: directory })
  return directory
}

/** A directory outside every repository, so git cannot report history for it. */
function createPlainDirectory(): Promise<string> {
  return createTemporaryDirectory(tmpdir())
}

async function createTemporaryDirectory(parent: string): Promise<string> {
  const directory = await mkdtemp(join(parent, 'kawapress-last-updated-'))
  temporaryDirectories.push(directory)
  return directory
}

async function commit(
  root: string,
  path: string,
  content: string,
): Promise<void> {
  const file = join(root, path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
  execFileSync('git', ['add', '-A'], { cwd: root })
  execFileSync('git', [
    '-c',
    'user.name=test',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-q',
    '-m',
    `docs: add ${path}`,
  ], {
    cwd: root,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: COMMIT_DATE,
      GIT_COMMITTER_DATE: COMMIT_DATE,
    },
  })
}
