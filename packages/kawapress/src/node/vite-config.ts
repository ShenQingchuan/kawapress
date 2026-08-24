import type { InlineConfig, Plugin } from 'vite'
import type { ResolvedSiteConfig } from './config'
import vue from '@vitejs/plugin-vue'
import { createMarkdownPageLoader } from './markdown-page-loader'
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
    base: siteConfig.base,
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
    plugins: createBasePlugins(root, siteConfig),
  }
}

function createBasePlugins(
  root: string,
  siteConfig: ResolvedSiteConfig,
): Plugin[] {
  const pageLoader = createMarkdownPageLoader({
    root,
    base: siteConfig.base,
    srcDir: siteConfig.srcDir,
    pluginRunner: siteConfig.pluginRunner,
  })

  return [
    markdownPlugin(pageLoader),
    vue({
      include: [
        /\.vue$/,
        /\.md$/,
      ],
    }),
    virtualRuntimePluginsPlugin({
      pluginNames: siteConfig.plugins.map(plugin => plugin.name),
    }),
    virtualPagesPlugin({
      srcDir: siteConfig.srcDir,
      pageLoader,
    }),
    virtualSitePlugin({
      title: siteConfig.title,
      base: siteConfig.base,
      locales: siteConfig.locales,
      ...(
        siteConfig.themeConfig === undefined
          ? {}
          : { themeConfig: siteConfig.themeConfig }
      ),
    }),
  ]
}
