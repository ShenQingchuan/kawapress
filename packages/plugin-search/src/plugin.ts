import type { KawaPressPlugin, SiteConfig } from 'kawapress'
import type { SearchCalloutOptions } from './search-index-plugin'
import { definePlugin } from 'kawapress'
import { searchIndexPlugin } from './search-index-plugin'

export type SearchPluginOptions = SearchCalloutOptions

export function searchPlugin(options: SearchPluginOptions = {}): KawaPressPlugin {
  let siteConfig: SiteConfig | undefined

  return definePlugin({
    name: '@kawapress/plugin-search',
    setup(api) {
      api.config((config) => {
        siteConfig = config
      })
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(searchIndexPlugin({
          srcDir: siteConfig?.srcDir ?? '.',
          locales: Object.keys(siteConfig?.locales ?? { root: {} }),
          localeLanguages: Object.fromEntries(
            Object.entries(siteConfig?.locales ?? {}).map(([locale, config]) => (
              [locale, config.lang]
            )),
          ),
          callouts: options,
        }))
      })
    },
  })
}
