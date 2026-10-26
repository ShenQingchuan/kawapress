import type { InlineConfig, Plugin } from 'vite'
import type { MarkdownPageLoader } from '../../compiler/page-loader'
import type { ResolvedSiteConfig } from '../config'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { createMarkdownPageLoader } from '../../compiler/page-loader'
import { createDataLoaderContext } from '../data/context'
import { dataLoaderPlugin } from './plugins/data'
import { devDeadLinksPlugin } from './plugins/dev-dead-links'
import { markdownPlugin } from './plugins/markdown'
import { createPageRouteIndex, virtualPagesPlugin } from './plugins/pages'
import { virtualRuntimePluginsPlugin } from './plugins/runtime-plugins'
import { virtualSitePlugin } from './plugins/site'

const require = createRequire(import.meta.url)
const VUE_PACKAGE_PATH = 'vue/package.json'

export interface CreateBaseViteConfigOptions {
  /** Reuse a page loader created by the caller, for example to read its link registry. */
  pageLoader?: MarkdownPageLoader
}

export function createBaseViteConfig(
  root: string,
  siteConfig: ResolvedSiteConfig,
  options: CreateBaseViteConfigOptions = {},
): InlineConfig {
  const pageLoader = options.pageLoader ?? createSitePageLoader(root, siteConfig)
  return {
    root,
    base: siteConfig.base,
    publicDir: resolve(root, siteConfig.srcDir, siteConfig.publicDir),
    clearScreen: false,
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
    plugins: createBasePlugins(root, siteConfig, pageLoader),
  }
}

/** Page loader shared by the Vite plugins and, during a build, the link checker. */
export function createSitePageLoader(
  root: string,
  siteConfig: ResolvedSiteConfig,
): MarkdownPageLoader {
  return createMarkdownPageLoader({
    root,
    base: siteConfig.base,
    srcDir: siteConfig.srcDir,
    pluginRunner: siteConfig.pluginRunner,
  })
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
  pageLoader: MarkdownPageLoader,
): Plugin[] {
  const dataLoaderContext = createDataLoaderContext(root, siteConfig)
  const pageRoutes = createPageRouteIndex(pageLoader, siteConfig.publicDir)

  return [
    dataLoaderPlugin(dataLoaderContext),
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
      publicDir: siteConfig.publicDir,
      pageLoader,
      pageRoutes,
    }),
    virtualSitePlugin({
      title: siteConfig.title,
      base: siteConfig.base,
      head: siteConfig.head,
      locales: siteConfig.locales,
      ...(
        siteConfig.themeConfig === undefined
          ? {}
          : { themeConfig: siteConfig.themeConfig }
      ),
    }),
    devDeadLinksPlugin({
      pageLoader,
      pageRoutes,
      deadLinks: siteConfig.deadLinks,
    }),
  ]
}
