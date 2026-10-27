import type { ModuleNode, Plugin, ViteDevServer } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { PageSummaryReader } from '../../../compiler/page-summary'
import type { PageSummary } from '../../../core/page-manifest'
import type { MarkdownPageScope } from '../../pages'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPageSummaryReader } from '../../../compiler/page-summary'
import { stringifyJson } from '../../../core/json'
import { isMarkdownPage, listMarkdownPages } from '../../pages'

/** Virtual module holding the page manifest. */
export const PAGE_MANIFEST_MODULE_ID = 'virtual:kawapress-pages'
const RESOLVED_ID = `\0${PAGE_MANIFEST_MODULE_ID}`
/**
 * Own chunk of the page manifest in the client build. Page content changes far
 * more often than framework and theme code, so the two must not share a chunk.
 */
export const PAGE_MANIFEST_CHUNK_NAME = 'page-manifest'
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
function pageScope(
  pageLoader: MarkdownPageLoader,
  publicDir: string,
): MarkdownPageScope {
  return {
    sourceRoot: pageLoader.sourceRoot,
    publicDir: resolve(pageLoader.sourceRoot, publicDir),
  }
}

export function virtualPagesPlugin(options: VirtualPagesOptions): Plugin {
  const summaryReader = createPageSummaryReader()
  const scope = pageScope(options.pageLoader, options.publicDir)
  const isPage = (file: string) => isMarkdownPage(file, scope)

  return {
    name: 'kawapress:virtual-pages',
    resolveId(id) {
      if (id === PAGE_MANIFEST_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id === RESOLVED_ID) {
        return renderPagesModule(await readManifestPages(scope, options, summaryReader))
      }
    },
    configureServer(server) {
      // A page that is added or removed changes the manifest, and the manifest
      // is written by this plugin only: nothing else invalidates the virtual
      // module, so a running browser has to be sent back to the server.
      for (const event of ['add', 'unlink'] as const) {
        server.watcher.on(event, (file: string) => {
          if (!isPage(file)) {
            return
          }
          options.pageRoutes.invalidate()
          if (invalidateManifestModule(server)) {
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

      const virtualModule = invalidateManifestModule(context.server)
      if (virtualModule) {
        return [...context.modules, virtualModule]
      }
    },
  }
}

/**
 * Marks the manifest module stale and returns it when the dev server holds a
 * copy, which is the case as soon as a browser asked for it.
 */
function invalidateManifestModule(server: ViteDevServer): ModuleNode | undefined {
  const virtualModule = server.moduleGraph.getModuleById(RESOLVED_ID)
  if (!virtualModule) {
    return
  }
  server.moduleGraph.invalidateModule(virtualModule)
  return virtualModule
}

/** One record of the generated manifest: a page module and its route summary. */
export interface ManifestPage {
  /** Public route path the record is keyed by. */
  path: string
  /** Module id to import when the page is needed. */
  id: string
  summary: PageSummary
}

/**
 * Source of the page manifest virtual module: one record per page, keyed by
 * route path. The generator resolves the module ids, so the browser never maps
 * source file paths to routes.
 */
export function renderPagesModule(pages: readonly ManifestPage[]): string {
  const records = pages.map(page =>
    `  ${jsonLiteral(page.path)}: { ${manifestFields(page)} },`,
  )
  return `export const pageManifest = {\n${records.join('\n')}\n}\n`
}

function manifestFields(page: ManifestPage): string {
  const fields = [`title: ${jsonLiteral(page.summary.title)}`]
  if (page.summary.layout !== undefined) {
    fields.push(`layout: ${jsonLiteral(page.summary.layout)}`)
  }
  fields.push(`load: () => import(${jsonLiteral(page.id)})`)
  return fields.join(', ')
}

/** Escaped string literal, so a title can never break out of the module. */
function jsonLiteral(value: string): string {
  return stringifyJson(value, {
    label: 'the page manifest',
    path: 'pageManifest',
  })
}

/**
 * Route summaries of every page on disk. Reading them never renders a page, so
 * the first dev request does not compile the whole site.
 */
async function readManifestPages(
  scope: MarkdownPageScope,
  options: VirtualPagesOptions,
  summaryReader: PageSummaryReader,
): Promise<ManifestPage[]> {
  const pages = await listMarkdownPages(scope)
  return Promise.all(pages.map(async (page) => {
    const source = await readFile(page.file, 'utf8')
    return {
      path: page.routePath,
      id: pageModuleId(page.sourcePath, options.srcDir),
      summary: summaryReader.read(source, page.file),
    }
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
