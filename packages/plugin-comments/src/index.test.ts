import type { GeneratorPluginAPI } from 'kawapress'
import type { UserConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { commentsPlugin } from './index'
import { COMMENTS_OPTIONS_MODULE_ID } from './vite-plugin'

interface ExecutableOptionsPlugin {
  name: string
  resolveId: (id: string) => string | undefined
  load: (id: string) => string | undefined
}

describe('comments plugin', () => {
  it('publishes the resolved options to the runtime as JSON', async () => {
    const viteHandler = await collectViteHandler(commentsPlugin({
      giscus: {
        repo: 'kawapress/kawapress',
        repoId: 'R_kgDOExample',
        category: 'Comments',
        categoryId: 'DIC_kwDOExample',
      },
      localeLabels: { root: { heading: '评论' } },
    }))
    const config: UserConfig = {}
    await viteHandler(config)

    const plugin = findOptionsPlugin(config)
    const resolvedId = plugin.resolveId(COMMENTS_OPTIONS_MODULE_ID)
    if (!resolvedId) {
      throw new Error('Expected the comments options module to resolve.')
    }
    const source = plugin.load(resolvedId)
    if (!source?.startsWith('export default ')) {
      throw new Error('Expected the comments options module to load JSON.')
    }

    const options = JSON.parse(source.slice('export default '.length))
    expect(options).toEqual({
      giscus: {
        repo: 'kawapress/kawapress',
        repoId: 'R_kgDOExample',
        category: 'Comments',
        categoryId: 'DIC_kwDOExample',
        mapping: 'pathname',
        strict: false,
        reactionsEnabled: true,
        inputPosition: 'bottom',
        loading: 'lazy',
      },
      labels: {},
      localeLabels: { root: { heading: '评论' } },
    })
  })

  it('reports a missing giscus configuration before the build starts', () => {
    expect(() => commentsPlugin({ giscus: {} } as never)).toThrowError(
      /giscus\.repo/,
    )
  })
})

async function collectViteHandler(
  plugin: ReturnType<typeof commentsPlugin>,
): Promise<(config: UserConfig) => void | Promise<void>> {
  let viteHandler: ((config: UserConfig) => void | Promise<void>) | undefined

  await plugin.setup({
    config: () => {},
    markdown: () => {},
    pageData: () => {},
    pageArtifact: () => {},
    vite: (handler) => {
      viteHandler = handler
    },
    buildArtifacts: () => {},
  } satisfies GeneratorPluginAPI)

  if (!viteHandler) {
    throw new Error('Expected the comments plugin to register a Vite handler.')
  }
  return viteHandler
}

function findOptionsPlugin(config: UserConfig): ExecutableOptionsPlugin {
  const plugin = config.plugins?.find((candidate) => {
    if (!candidate || typeof candidate !== 'object' || !('name' in candidate)) {
      return false
    }
    return candidate.name === 'kawapress:comments-options'
  })
  if (!plugin) {
    throw new Error('Expected the comments plugin to install its options plugin.')
  }
  return plugin as unknown as ExecutableOptionsPlugin
}
