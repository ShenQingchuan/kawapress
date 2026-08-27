import type { MarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { definePlugin } from '../api/plugin'
import { createGeneratorPluginRunner } from './generator-runner'

describe('createGeneratorPluginRunner', () => {
  it('runs setup and config handlers serially in plugin order', async () => {
    const calls: string[] = []
    const runner = await createGeneratorPluginRunner([
      definePlugin({
        name: 'first',
        async setup(api) {
          await Promise.resolve()
          calls.push('setup:first')
          api.config(async (config) => {
            await Promise.resolve()
            calls.push('config:first')
            config.title += ' first'
          })
        },
      }),
      definePlugin({
        name: 'second',
        setup(api) {
          calls.push('setup:second')
          api.config((config) => {
            calls.push(`config:second:${config.title}`)
            config.title += ' second'
          })
        },
      }),
    ])
    const config = { title: 'Docs' }

    await runner.runConfig(config)

    expect(calls).toEqual([
      'setup:first',
      'setup:second',
      'config:first',
      'config:second:Docs first',
    ])
    expect(config.title).toBe('Docs first second')
  })

  it('reports the plugin and invalid field when pageData is not serializable', async () => {
    const runner = await createGeneratorPluginRunner([
      definePlugin({
        name: 'invalid-page-data',
        setup(api) {
          api.pageData((pageData) => {
            pageData.frontmatter.order = 1n
          })
        },
      }),
    ])

    const run = runner.runPageData({
      path: '/guide',
      title: 'Guide',
      frontmatter: {},
      headers: [],
    })

    await expect(run).rejects.toThrow(
      '[invalid-page-data / generator / pageData] Plugin execution failed.',
    )
    await expect(run).rejects.toThrow(
      'KawaPress: pageData for route "/guide" is not JSON-serializable.',
    )
    await expect(run).rejects.toThrow(
      'Found unsupported bigint value at pageData.frontmatter.order.',
    )
  })

  it('exposes page artifacts by revision and builds with stable source order', async () => {
    const observed: string[] = []
    const built: string[][] = []
    const runner = await createGeneratorPluginRunner([
      definePlugin({
        name: 'artifacts',
        setup(api) {
          api.pageArtifact((page) => {
            observed.push(`${page.sourcePath}:${page.source}`)
          })
          api.buildArtifacts(({ pages }) => {
            built.push(pages.map(page => `${page.sourcePath}:${page.source}`))
          })
        },
      }),
    ])
    const pageData = {
      path: '/guide',
      title: 'Guide',
      frontmatter: {},
      headers: [],
    }

    await runner.runPageArtifact({
      source: 'B1',
      file: '/site/b.md',
      sourcePath: '/b.md',
      routePath: '/b',
      pageData,
    })
    await runner.runPageArtifact({
      source: 'A',
      file: '/site/a.md',
      sourcePath: '/a.md',
      routePath: '/a',
      pageData,
    })
    await runner.runPageArtifact({
      source: 'B2',
      file: '/site/b.md',
      sourcePath: '/b.md',
      routePath: '/b',
      pageData,
    })
    await runner.runBuildArtifacts({
      emitFile: async () => {},
      importModule: async <T>() => ({} as T),
    })

    expect(observed).toEqual(['/b.md:B1', '/a.md:A', '/b.md:B2'])
    expect(built).toEqual([['/a.md:A', '/b.md:B2']])
  })

  it('reports the plugin and capability when a handler fails', async () => {
    const cause = new Error('broken markdown')
    const runner = await createGeneratorPluginRunner([
      definePlugin({
        name: 'broken-plugin',
        setup(api) {
          api.markdown(() => {
            throw cause
          })
        },
      }),
    ])

    const run = runner.runMarkdown({} as MarkdownExit)

    await expect(run).rejects.toThrow(
      '[broken-plugin / generator / markdown] Plugin execution failed.',
    )
    await expect(run).rejects.toHaveProperty('cause', cause)
  })
})
