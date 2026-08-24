import type { KawaPressPlugin, SiteConfig } from 'kawapress'
import { definePlugin } from 'kawapress'
import { searchIndexPlugin } from './search-index-plugin'

export function searchPlugin(): KawaPressPlugin {
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
        }))
      })
    },
  })
}
