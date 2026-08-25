import type { PresetConfig } from 'kawapress'
import type { NagiThemeConfig, ResolvedNagiThemeConfig } from './theme-config'
import { codeGroupPlugin } from '@kawapress/plugin-code-group'
import { searchPlugin } from '@kawapress/plugin-search'
import { shikiPlugin } from '@kawapress/plugin-shiki'
import { unocssPlugin } from '@kawapress/plugin-unocss'
import { definePreset } from 'kawapress'
import { createNagiPlugin } from './nagi-plugin'

export type NagiConfig = PresetConfig<ResolvedNagiThemeConfig>
export type {
  NagiHomeAction,
  NagiHomeFeature,
  NagiHomeFrontmatter,
  NagiHomeHero,
  NagiHomeImage,
  NagiImageSource,
  NagiThemeableImage,
} from './home'
export { defineLocalizedSidebars } from './sidebar'
export type {
  DefineLocalizedSidebarsOptions,
  LocalizedSidebarItem,
  LocalizedSidebarText,
  NagiSidebarConfig,
  NagiSidebarItem,
  NagiSidebarSection,
} from './sidebar'
export type { NagiThemeConfig } from './theme-config'

export function nagi(userConfig: NagiConfig = {}): NagiConfig {
  const createConfig = definePreset<NagiThemeConfig>({
    plugins: [
      codeGroupPlugin(),
      searchPlugin(),
      shikiPlugin({
        twoslash: true,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
      }),
      createNagiPlugin(),
      unocssPlugin(),
    ],
  })

  return createConfig(userConfig)
}

export default nagi
