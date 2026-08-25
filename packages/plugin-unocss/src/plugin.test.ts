import type { GeneratorPluginAPI, GeneratorPluginHandler } from 'kawapress'
import type { UserConfig } from 'vite'
import { createGenerator } from 'unocss'
import { describe, expect, it } from 'vitest'
import { createUnoCSSConfig, unocssPlugin } from './plugin'

describe('unocssPlugin', () => {
  it('enables the nagi default presets without the Wind4 reset', async () => {
    const generator = await createGenerator(createUnoCSSConfig())
    const presets = generator.config.presets

    expect(presets.map(preset => preset.name)).toEqual(expect.arrayContaining([
      '@unocss/preset-wind4',
      '@unocss/preset-icons',
      '@unocss/preset-web-fonts',
    ]))
    expect(presets).toHaveLength(3)
    expect(presets.find(preset => preset.name === '@unocss/preset-wind4')?.options)
      .toMatchObject({
        preflights: {
          reset: false,
        },
      })

    const { css } = await generator.generate(new Set([
      'p-4',
      'rounded-xl',
      'bg-indigo-500/8',
    ]))
    expect(css).toContain('.p-4')
    expect(css).toContain('.rounded-xl')
    expect(css).toContain('--colors-indigo-500')
    expect(css).toContain('color-mix')
    expect(css).not.toContain('box-sizing:border-box')
  })

  it('lets an explicit preset list replace the defaults', async () => {
    const generator = await createGenerator(createUnoCSSConfig({
      presets: [{
        name: 'test-preset',
        rules: [['test-rule', { color: 'red' }]],
      }],
    }))

    expect(generator.config.presets.map(preset => preset.name)).toEqual([
      'test-preset',
    ])
  })

  it('installs the UnoCSS Vite plugins through the public KawaPress hook', async () => {
    let viteHandler: GeneratorPluginHandler<UserConfig> | undefined
    const api: GeneratorPluginAPI = {
      config() {},
      markdown() {},
      pageData() {},
      vite(handler) {
        viteHandler = handler
      },
    }

    await unocssPlugin().setup(api)
    if (!viteHandler) {
      throw new Error('Expected unocssPlugin to register a Vite handler')
    }

    const config: UserConfig = {}
    await viteHandler(config)

    expect(config.plugins?.map(plugin => plugin && 'name' in plugin && plugin.name))
      .toContain('unocss:api')
  })
})
