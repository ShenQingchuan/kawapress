import type { Dirent } from 'node:fs'
import type { ModuleNode, Plugin, ViteDevServer } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { PageSummaryReader } from '../../../compiler/page-summary'
import type { PageSummary } from '../../../core/page-manifest'
import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { markdownFileToSourcePath } from '../../../compiler/page-loader'
import { createPageSummaryReader } from '../../../compiler/page-summary'
import { stringifyJson } from '../../../core/json'
import { markdownPagePathToRoutePath } from '../../../core/markdown-route'

/** Virtual module holding the page manifest. */
export const PAGE_MANIFEST_MODULE_ID = 'virtual:kawapress-pages'
const RESOLVED_ID = `\0${PAGE_MANIFEST_MODULE_ID}`
/**
 * Own chunk of the page manifest in the client build. Page content changes far
 * more often than framework and theme code, so the two must not share a chunk.
 */
export const PAGE_MANIFEST_CHUNK_NAME = 'page-manifest'
const IGNORED_DIRECTORIES = new Set([
  'dist',
  'node_modules',
])
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
  const pages = await listMarkdownPages(pageLoader, publicDir)
  return pages.map(page => page.path)
}

export function virtualPagesPlugin(options: VirtualPagesOptions): Plugin {
  const summaryReader = createPageSummaryReader()
  const isPage = (file: string) => isMarkdownFile(
    file,
    options.pageLoader.sourceRoot,
    resolve(options.pageLoader.sourceRoot, options.publicDir),
  )

  return {
    name: 'kawapress:virtual-pages',
    resolveId(id) {
      if (id === PAGE_MANIFEST_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id === RESOLVED_ID) {
        return renderPagesModule(await readManifestPages(options, summaryReader))
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

/** One Markdown page on disk, before its route summary is read. */
interface MarkdownPage {
  file: string
  /** Public route path, for example `/guide/intro`. */
  path: string
  /** Path relative to `srcDir`, for example `/guide/intro.md`. */
  sourcePath: string
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
  options: VirtualPagesOptions,
  summaryReader: PageSummaryReader,
): Promise<ManifestPage[]> {
  const pages = await listMarkdownPages(options.pageLoader, options.publicDir)
  return Promise.all(pages.map(async (page) => {
    const source = await readFile(page.file, 'utf8')
    return {
      path: page.path,
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

async function listMarkdownPages(
  pageLoader: MarkdownPageLoader,
  publicDir: string,
): Promise<MarkdownPage[]> {
  const publicDirectory = resolve(pageLoader.sourceRoot, publicDir)
  const files = await findMarkdownFiles(pageLoader.sourceRoot, publicDirectory)
  return files.map((file) => {
    const sourcePath = markdownFileToSourcePath(file, pageLoader.sourceRoot)
    return { file, path: markdownPagePathToRoutePath(sourcePath), sourcePath }
  })
}

async function findMarkdownFiles(
  directory: string,
  publicDirectory: string,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries
    .sort(compareEntries)
    .map(async (entry) => {
      const path = join(directory, entry.name)
      if (shouldIgnore(entry, path, publicDirectory)) {
        return []
      }
      if (entry.isDirectory()) {
        return findMarkdownFiles(path, publicDirectory)
      }
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : []
    }))

  return files.flat()
}

function isMarkdownFile(
  file: string,
  sourceRoot: string,
  publicDirectory: string,
): boolean {
  const relativePath = relative(sourceRoot, file)
  return file.endsWith('.md')
    && !isAbsolute(relativePath)
    && relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
    && !isInDirectory(file, publicDirectory)
}

function compareEntries(a: Dirent, b: Dirent): number {
  return a.name.localeCompare(b.name)
}

function isInDirectory(file: string, directory: string): boolean {
  const relativePath = relative(directory, file)
  return relativePath === ''
    || (!isAbsolute(relativePath)
      && relativePath !== '..'
      && !relativePath.startsWith(`..${sep}`))
}

function shouldIgnore(
  entry: Dirent,
  path: string,
  publicDirectory: string,
): boolean {
  return entry.name.startsWith('.')
    || path === publicDirectory
    || (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name))
}
