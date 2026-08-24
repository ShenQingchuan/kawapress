import type { KawaPressPlugin, SiteConfig } from 'kawapress'
import { definePlugin } from 'kawapress'
import { nagiSidebarMetaPlugin } from './sidebar-meta-plugin'

const RUNTIME_DEPENDENCIES = ['overlayscrollbars-vue']

export function createNagiPlugin(): KawaPressPlugin {
  let siteConfig: SiteConfig | undefined

  return definePlugin({
    name: '@kawapress/preset-nagi',
    setup(api) {
      api.config((config) => {
        siteConfig = config
      })
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(nagiSidebarMetaPlugin(siteConfig?.srcDir ?? '.'))

        const noExternal = config.ssr?.noExternal
        if (noExternal !== true) {
          config.ssr ??= {}
          config.ssr.noExternal = [
            ...(Array.isArray(noExternal)
              ? noExternal
              : noExternal ? [noExternal] : []),
            ...RUNTIME_DEPENDENCIES,
          ]
        }
      })
    },
  })
}
