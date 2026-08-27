import type { CodeBlockPluginOptions } from '@kawapress/plugin-code-block'
import type { LlmsPluginOptions } from '@kawapress/plugin-llms'
import type { PresetConfig } from 'kawapress'
import type { NagiThemeConfig, ResolvedNagiThemeConfig } from './theme-config'
import { codeBlockPlugin } from '@kawapress/plugin-code-block'
import { codeGroupPlugin } from '@kawapress/plugin-code-group'
import { containerPlugin } from '@kawapress/plugin-container'
import { githubAlertsPlugin } from '@kawapress/plugin-github-alerts'
import { llmsPlugin } from '@kawapress/plugin-llms'
import { searchPlugin } from '@kawapress/plugin-search'
import { shikiPlugin } from '@kawapress/plugin-shiki'
import { unocssPlugin } from '@kawapress/plugin-unocss'
import { definePreset } from 'kawapress'
import { nagiThemePlugin } from './theme-plugin'

export type NagiConfig = PresetConfig<ResolvedNagiThemeConfig> & {
  codeBlock?: CodeBlockPluginOptions
  llms?: LlmsPluginOptions
}
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
  const { codeBlock, llms, ...siteConfig } = userConfig
  const createConfig = definePreset<NagiThemeConfig>({
    plugins: [
      nagiThemePlugin(),
      containerPlugin(),
      githubAlertsPlugin(),
      unocssPlugin(),
      codeBlockPlugin(codeBlock),
      codeGroupPlugin(),
      searchPlugin({
        containers: true,
        githubAlerts: true,
      }),
      shikiPlugin({
        twoslash: true,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
      }),
      llmsPlugin(llms),
    ],
  })

  return createConfig(siteConfig)
}

export default nagi
