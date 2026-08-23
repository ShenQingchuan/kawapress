import type { MarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { definePlugin } from '../plugin-api'
import { createGeneratorPluginRunner } from './plugin-runner'

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
