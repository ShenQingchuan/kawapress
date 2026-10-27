import type { InlineConfig, Plugin } from 'vite'
import type { MarkdownPageLoader } from '../../compiler/page-loader'
import type { ResolvedSiteConfig } from '../config'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import { createMarkdownPageLoader } from '../../compiler/page-loader'
import { createDataLoaderContext } from '../data/context'
import { runtimeDependencySpecifiers } from '../runtime-dependencies'
import { dataLoaderPlugin } from './plugins/data'
import { devDeadLinksPlugin } from './plugins/dev-dead-links'
import { markdownPlugin } from './plugins/markdown'
import { createPageRouteIndex, virtualPagesPlugin } from './plugins/pages'
import { virtualRuntimePluginsPlugin } from './plugins/runtime-plugins'
import { virtualSitePlugin } from './plugins/site'

const require = createRequire(import.meta.url)
const VUE_PACKAGE_PATH = 'vue/package.json'
const KAWAPRESS_PACKAGE_NAME = 'kawapress'

/**
 * Packages the browser entry imports before it asks for a page: the head
 * manager. A site installs `kawapress` and not its dependencies, so the site root
 * cannot resolve them by name and they are declared through the chain of
 * packages that leads to them.
 */
const CORE_RUNTIME_DEPENDENCIES = ['@unhead/vue', '@unhead/vue/client']

/**
 * Vue is declared by its bare name, not through that chain. `resolve.alias`
 * already points every `vue` import at one file, including the imports in
 * Markdown pages, and a page cannot resolve the package on its own: Vite finds
 * the declared dependency for such an import by its bare name only.
 */
const VUE_DEPENDENCY = 'vue'

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
    ...createDefineOverrides(),
    resolve: {
      alias: resolveVueAliases(root),
      dedupe: ['vue'],
    },
    ssr: {
      noExternal: ['vue', /^@vue\//],
      resolve: {
        conditions: ['module'],
      },
    },
    // Without declared entries the optimizer starts empty: there is no
    // `index.html` to scan, so every dependency would be discovered after the
    // first page request and force a full reload. See useRuntimeDependencies().
    optimizeDeps: {
      include: [
        VUE_DEPENDENCY,
        ...runtimeDependencySpecifiers(
          root,
          KAWAPRESS_PACKAGE_NAME,
          CORE_RUNTIME_DEPENDENCIES,
        ),
      ],
    },
    plugins: createBasePlugins(root, siteConfig, pageLoader),
  }
}

/**
 * Compile-time flags for this site's bundles.
 *
 * The repository's E2E suite fails a test whenever Vue reports a hydration
 * mismatch, and Vue only prints the detailed message of a production build when
 * `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` is on. `KAWAPRESS_E2E=1` is set by
 * the Playwright servers only, so this stays an internal switch: user builds
 * keep Vue's default and behave exactly as before. Vite merges these entries
 * with the `define` values that plugins add later.
 */
function createDefineOverrides(): Pick<InlineConfig, 'define'> {
  return process.env.KAWAPRESS_E2E === '1'
    ? { define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true' } }
    : {}
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
