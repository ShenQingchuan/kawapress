import type { KawaPressPlugin } from 'kawapress'
import type { VitePluginConfig } from 'unocss/vite'
import { definePlugin } from 'kawapress'
import { presetIcons, presetWebFonts, presetWind4 } from 'unocss'
import UnoCSS from 'unocss/vite'

export type UnoCSSPluginOptions = VitePluginConfig

export function unocssPlugin(
  options: UnoCSSPluginOptions = {},
): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/plugin-unocss',
    setup(api) {
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(...UnoCSS(createUnoCSSConfig(options)))
      })
    },
  })
}

export function createUnoCSSConfig(
  options: UnoCSSPluginOptions = {},
): VitePluginConfig {
  const {
    presets = [
      presetWind4({
        preflights: {
          reset: false,
        },
      }),
      presetIcons(),
      presetWebFonts(),
    ],
    ...rest
  } = options

  return {
    ...rest,
    presets,
  }
}
