import type { ModuleNode, Plugin, ViteDevServer } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { MarkdownPageScope } from '../../pages'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stringifyJson } from '../../../core/json'
import { isMarkdownPage, listMarkdownPages } from '../../pages'

/** Virtual module holding the page table. */
export const PAGES_MODULE_ID = 'virtual:kawapress-pages'
const RESOLVED_ID = `\0${PAGES_MODULE_ID}`

/**
 * Module the built page table is read through. The browser build points the
 * virtual module at this file, which turns the table file into page loaders.
 */
const PAGE_TABLE_MODULE_PATH = fileURLToPath(
  new URL('../../../client/page-table.ts', import.meta.url),
)

export interface VirtualPagesOptions {
  srcDir: string
  publicDir: string
  pageLoader: MarkdownPageLoader
  pageRoutes: PageRouteIndex
}

/** Public routes of the Markdown files on disk, cached until the site changes. */
export interface PageRouteIndex {
  routes: () => Promise<string[]>
  invalidate: () => void
}

export function createPageRouteIndex(
  pageLoader: MarkdownPageLoader,
  publicDir: string,
): PageRouteIndex {
  let cached: Promise<string[]> | undefined
  return {
    routes() {
      cached ??= listPageRoutes(pageLoader, publicDir)
      return cached
    },
    invalidate() {
      cached = undefined
    },
  }
}

export async function listPageRoutes(
  pageLoader: MarkdownPageLoader,
  publicDir: string,
): Promise<string[]> {
  const pages = await listMarkdownPages(pageScope(pageLoader, publicDir))
  return pages.map(page => page.routePath)
}

/** Where the pages of the site are, from the site config the loader was built with. */
export function pageScope(
  pageLoader: MarkdownPageLoader,
  publicDir: string,
): MarkdownPageScope {
  return {
    sourceRoot: pageLoader.sourceRoot,
    publicDir: resolve(pageLoader.sourceRoot, publicDir),
  }
}

export function virtualPagesPlugin(options: VirtualPagesOptions): Plugin {
  const scope = pageScope(options.pageLoader, options.publicDir)
  const isPage = (file: string) => isMarkdownPage(file, scope)

  return {
    name: 'kawapress:virtual-pages',
    resolveId(id) {
      if (id === PAGES_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id !== RESOLVED_ID) {
        return
      }
      // The browser build cannot name a page chunk before the bundle exists, so
      // it reads the table file the prerendered HTML points at. Dev, the SSR
      // build and the Markdown-only build import the page modules directly.
      return isBrowserBuild(this)
        ? renderBuiltPagesModule()
        : renderImportPagesModule(await readManifestPages(scope, options))
    },
    configureServer(server) {
      // A page that is added or removed changes the page table, and the table is
      // written by this plugin only: nothing else invalidates the virtual
      // module, so a running browser has to be sent back to the server.
      for (const event of ['add', 'unlink'] as const) {
        server.watcher.on(event, (file: string) => {
          if (!isPage(file)) {
            return
          }
          options.pageRoutes.invalidate()
          if (invalidatePagesModule(server)) {
            server.hot.send({ type: 'full-reload' })
          }
        })
      }
    },
    handleHotUpdate(context) {
      if (!isPage(context.file)) {
        return
      }
      options.pageRoutes.invalidate()

      const virtualModule = invalidatePagesModule(context.server)
      if (virtualModule) {
        return [...context.modules, virtualModule]
      }
    },
  }
}

/** Whether the module is being written for the browser bundle of a build. */
function isBrowserBuild(context: { environment?: { name: string, config: { command: string } } }): boolean {
  return context.environment?.name === 'client'
    && context.environment.config.command === 'build'
}

/**
 * Marks the page table module stale and returns it when the dev server holds a
 * copy, which is the case as soon as a browser asked for it.
 */
function invalidatePagesModule(server: ViteDevServer): ModuleNode | undefined {
  const virtualModule = server.moduleGraph.getModuleById(RESOLVED_ID)
  if (!virtualModule) {
    return
  }
  server.moduleGraph.invalidateModule(virtualModule)
  return virtualModule
}

/** One page of the site, as the dev server and the SSR build write it. */
export interface ManifestPage {
  /** Public route path the record is keyed by. */
  path: string
  /** Module id to import when the page is needed, for example `/src/guide/intro.md`. */
  id: string
}

/**
 * Page table of dev and the SSR build: one dynamic import per page, so Vite
 * compiles a page only when it is requested. `pageModules` gives prerendering
 * the module id of a page so it can find that page's chunk in the client
 * manifest.
 */
export function renderImportPagesModule(pages: readonly ManifestPage[]): string {
  const loaders = pages.map(page =>
    `  ${jsonLiteral(page.path)}: () => import(${jsonLiteral(page.id)}),`,
  )
  const ids = pages.map(page =>
    `  ${jsonLiteral(page.path)}: ${jsonLiteral(page.id)},`,
  )
  return `export const pages = {\n${loaders.join('\n')}\n}\n`
    + `export const pageModules = {\n${ids.join('\n')}\n}\n`
}

/**
 * Page table of the browser build. A page chunk has a content hash, so its file
 * name only exists once the bundle is written; the table therefore lives in a
 * file of its own that the prerendered HTML links. No chunk refers to a page by
 * name, which is also what keeps Vite from writing a preload dependency table.
 */
export function renderBuiltPagesModule(): string {
  return `import { site } from 'virtual:kawapress-site'\n`
    + `import { loadPageTable, readPageTableUrl } from ${jsonLiteral(PAGE_TABLE_MODULE_PATH)}\n`
    + `export const pages = await loadPageTable(readPageTableUrl(), site.base)\n`
}

/** Escaped string literal, so a route can never break out of the module. */
function jsonLiteral(value: string): string {
  return stringifyJson(value, {
    label: 'the page table',
    path: 'pages',
  })
}

/** Every page on disk with the module id to import it by. */
async function readManifestPages(
  scope: MarkdownPageScope,
  options: VirtualPagesOptions,
): Promise<ManifestPage[]> {
  const pages = await listMarkdownPages(scope)
  return pages.map(page => ({
    path: page.routePath,
    id: pageModuleId(page.sourcePath, options.srcDir),
  }))
}

/**
 * Root-relative module id of a page, for example `/src/guide/intro.md`. Dev and
 * build both resolve such an id against the site root, which is why the
 * generator can write one import per page instead of a glob at runtime.
 */
function pageModuleId(sourcePath: string, srcDir: string): string {
  return `${srcDir === '.' ? '' : `/${srcDir}`}${sourcePath}`
}
