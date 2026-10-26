import type { Dirent } from 'node:fs'
import type { Plugin } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { PageSummaryReader } from '../../../compiler/page-summary'
import type { PageRouteMeta } from '../../../core/site'
import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { markdownFileToSourcePath } from '../../../compiler/page-loader'
import { createPageSummaryReader } from '../../../compiler/page-summary'
import { stringifyJsonForScript } from '../../../core/json'
import { markdownPagePathToRoutePath } from '../../../core/markdown-route'

const MODULE_ID = 'virtual:kawapress-pages'
const RESOLVED_ID = `\0${MODULE_ID}`
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
  const publicDirectory = resolve(pageLoader.sourceRoot, publicDir)
  const files = await findMarkdownFiles(pageLoader.sourceRoot, publicDirectory)
  return files.map(file => markdownPagePathToRoutePath(
    markdownFileToSourcePath(file, pageLoader.sourceRoot),
  ))
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
      if (id === MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id === RESOLVED_ID) {
        return generatePagesModule(options, summaryReader)
      }
    },
    configureServer(server) {
      // Added and removed pages never reach `handleHotUpdate`, so watch them too.
      for (const event of ['add', 'unlink'] as const) {
        server.watcher.on(event, (file: string) => {
          if (isPage(file)) {
            options.pageRoutes.invalidate()
          }
        })
      }
    },
    handleHotUpdate(context) {
      if (!isPage(context.file)) {
        return
      }
      options.pageRoutes.invalidate()

      const virtualModule = context.server.moduleGraph.getModuleById(RESOLVED_ID)
      if (virtualModule) {
        context.server.moduleGraph.invalidateModule(virtualModule)
        return [...context.modules, virtualModule]
      }
    },
  }
}

async function generatePagesModule(
  options: VirtualPagesOptions,
  summaryReader: PageSummaryReader,
): Promise<string> {
  const prefix = options.srcDir === '.' ? '' : `/${options.srcDir}`
  const publicPrefix = `${prefix}/${options.publicDir}`
  const globPatterns = [
    `${prefix}/**/*.md`,
    `!${publicPrefix}/**`,
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.*/**',
  ]
  const pageRoutes = await loadPageRoutes(options, summaryReader)
  const serializedPageRoutes = stringifyJsonForScript(pageRoutes, {
    label: 'the page route summaries',
    path: 'pageRoutes',
  })

  return `
import { markdownPagePathToRoutePath } from 'kawapress'

const mdFiles = import.meta.glob(${JSON.stringify(globPatterns)})

export const pages = Object.fromEntries(
  Object.entries(mdFiles).map(([file, loader]) => [
    markdownPagePathToRoutePath(file.slice(${JSON.stringify(prefix)}.length)),
    loader,
  ]),
)

export const pageRoutes = ${serializedPageRoutes}
`
}

/**
 * Route summaries of every page on disk. Reading them never renders a page, so
 * the first dev request does not compile the whole site.
 */
async function loadPageRoutes(
  options: VirtualPagesOptions,
  summaryReader: PageSummaryReader,
): Promise<Record<string, PageRouteMeta>> {
  const files = await findMarkdownFiles(
    options.pageLoader.sourceRoot,
    resolve(options.pageLoader.sourceRoot, options.publicDir),
  )
  const entries = await Promise.all(files.map(async (file) => {
    const source = await readFile(file, 'utf8')
    const path = markdownPagePathToRoutePath(
      markdownFileToSourcePath(file, options.pageLoader.sourceRoot),
    )
    return [path, { path, ...summaryReader.read(source, file) }] as const
  }))

  return Object.fromEntries(entries)
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
