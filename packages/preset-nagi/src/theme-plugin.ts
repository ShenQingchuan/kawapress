import type { KawaPressPlugin, SiteConfig } from 'kawapress'
import { definePlugin } from 'kawapress'
import { useRuntimeDependencies } from 'kawapress/generator'
import { nagiSidebarMetaPlugin } from './sidebar-meta-plugin'

const PLUGIN_NAME = '@kawapress/preset-nagi'
const RUNTIME_DEPENDENCIES = ['overlayscrollbars']

export function nagiThemePlugin(): KawaPressPlugin {
  let siteConfig: SiteConfig | undefined

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.config((config) => {
        siteConfig = config
      })
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(nagiSidebarMetaPlugin(siteConfig?.srcDir ?? '.'))
        useRuntimeDependencies(config, PLUGIN_NAME, RUNTIME_DEPENDENCIES)
      })
    },
  })
}
