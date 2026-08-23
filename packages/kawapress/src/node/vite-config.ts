import type { InlineConfig, Plugin } from 'vite'
import type { ResolvedSiteConfig } from './config'
import vue from '@vitejs/plugin-vue'
import { markdownPlugin } from './markdown-plugin'
import { virtualPagesPlugin } from './virtual-pages'
import { virtualRuntimePluginsPlugin } from './virtual-runtime-plugins'
import { virtualSitePlugin } from './virtual-site'

export function createBaseViteConfig(
  root: string,
  siteConfig: ResolvedSiteConfig,
): InlineConfig {
  return {
    root,
    appType: 'custom',
    resolve: {
      alias: [{
        find: /^vue$/,
        replacement: 'vue/dist/vue.runtime.esm-bundler.js',
      }],
      dedupe: ['vue', 'vue-router'],
    },
    ssr: {
      noExternal: ['vue', 'vue-router', /^@vue\//],
      resolve: {
        conditions: ['module'],
      },
    },
    plugins: createBasePlugins(siteConfig),
  }
}

function createBasePlugins(
  siteConfig: ResolvedSiteConfig,
): Plugin[] {
  return [
    markdownPlugin(siteConfig.pluginRunner),
    vue({ include: [/\.vue$/, /\.md$/] }),
    virtualRuntimePluginsPlugin({
      pluginNames: siteConfig.plugins.map(plugin => plugin.name),
    }),
    virtualPagesPlugin({ srcDir: siteConfig.srcDir }),
    virtualSitePlugin({ title: siteConfig.title }),
  ]
}
