import type { InlineConfig, Plugin } from 'vite'
import type { ResolvedSiteConfig } from './config'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { createMarkdownPageLoader } from '../compiler/page-loader'
import { markdownPlugin } from './markdown-plugin'
import { virtualPagesPlugin } from './virtual-pages'
import { virtualRuntimePluginsPlugin } from './virtual-runtime-plugins'
import { virtualSitePlugin } from './virtual-site'

const require = createRequire(import.meta.url)
const VUE_PACKAGE_PATH = 'vue/package.json'

export function createBaseViteConfig(
  root: string,
  siteConfig: ResolvedSiteConfig,
): InlineConfig {
  return {
    root,
    base: siteConfig.base,
    appType: 'custom',
    resolve: {
      alias: resolveVueAliases(root),
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

function resolveVueAliases(root: string) {
  let packagePath: string
  try {
    packagePath = require.resolve(VUE_PACKAGE_PATH, { paths: [root] })
  }
  catch {
    packagePath = require.resolve(VUE_PACKAGE_PATH)
  }
  const vueRoot = dirname(packagePath)

  return [{
    find: /^vue$/,
    replacement: join(vueRoot, 'dist/vue.runtime.esm-bundler.js'),
  }, {
    find: /^vue\/server-renderer$/,
    replacement: join(vueRoot, 'server-renderer/index.mjs'),
  }]
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
