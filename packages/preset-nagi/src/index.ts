import type { PresetConfig } from 'kawapress'
import type { NagiThemeConfig, ResolvedNagiThemeConfig } from './theme-config'
import { shikiPlugin } from '@kawapress/plugin-shiki'
import { definePreset } from 'kawapress'
import { createNagiPlugin } from './nagi-plugin'

export type NagiConfig = PresetConfig<ResolvedNagiThemeConfig>
export type { NagiThemeConfig } from './theme-config'

export function nagi(userConfig: NagiConfig = {}): NagiConfig {
  const createConfig = definePreset<NagiThemeConfig>({
    plugins: [
      shikiPlugin({
        twoslash: true,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
      }),
      createNagiPlugin(),
    ],
  })

  return createConfig(userConfig)
}

export default nagi
