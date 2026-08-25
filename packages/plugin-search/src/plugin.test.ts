import type {
  GeneratorPluginAPI,
  SiteConfig,
} from 'kawapress'
import type { UserConfig } from 'vite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { searchPlugin } from './plugin'
import { loadSearchIndex } from './search'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

describe('search plugin', () => {
  it('carries locale and callout options through the generator lifecycle', async () => {
    const sourceRoot = await createTemporaryDirectory()
    await writeFile(join(sourceRoot, 'index.md'), `# 页面

> [!IMPORTANT]
> 需要搜索的正文。
`)
    const handlers = await registerPlugin(searchPlugin({
      githubAlerts: {
        localeLabels: {
          root: { important: '必须阅读' },
        },
      },
    }).setup)
    await handlers.config({
      srcDir: sourceRoot,
      locales: {
        root: { label: '简体中文', lang: 'zh-CN' },
      },
    })
    const viteConfig: UserConfig = {}
    await handlers.vite(viteConfig)
    const plugin = findSearchIndexPlugin(viteConfig)
    const resolvedId = plugin.resolveId(
      'virtual:kawapress-search-index/root?v=0',
    )
    if (!resolvedId) {
      throw new Error('Expected the root search index module to resolve.')
    }
    const moduleSource = await plugin.load(resolvedId)
    if (!moduleSource?.startsWith('export default ')) {
      throw new Error('Expected the root search index module to load.')
    }
    const serialized = JSON.parse(moduleSource.slice('export default '.length))
    const index = loadSearchIndex(serialized)

    expect(index.search('必须阅读').map(result => result.id)).toEqual(['/'])
    expect(index.search('IMPORTANT')).toEqual([])
  })
})

type Setup = (api: GeneratorPluginAPI) => void | Promise<void>

interface ExecutableSearchIndexPlugin {
  name: string
  resolveId: (id: string) => string | undefined
  load: (id: string) => Promise<string | undefined>
}

async function registerPlugin(setup: Setup): Promise<{
  config: (config: SiteConfig) => void | Promise<void>
  vite: (config: UserConfig) => void | Promise<void>
}> {
  let configHandler: ((config: SiteConfig) => void | Promise<void>) | undefined
  let viteHandler: ((config: UserConfig) => void | Promise<void>) | undefined

  await setup({
    config(handler) {
      configHandler = handler
    },
    markdown() {},
    pageData() {},
    vite(handler) {
      viteHandler = handler
    },
  })

  if (!configHandler || !viteHandler) {
    throw new Error('Expected search plugin to register config and Vite handlers.')
  }
  return {
    config: configHandler,
    vite: viteHandler,
  }
}

function findSearchIndexPlugin(config: UserConfig): ExecutableSearchIndexPlugin {
  const plugin = config.plugins?.find((candidate) => {
    if (!candidate || typeof candidate !== 'object' || !('name' in candidate)) {
      return false
    }
    return candidate.name === 'kawapress:search-index'
  })
  if (!plugin) {
    throw new Error('Expected search plugin to install its Vite index plugin.')
  }
  return plugin as unknown as ExecutableSearchIndexPlugin
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'kawapress-search-plugin-'))
  temporaryDirectories.push(directory)
  return directory
}
