import type { Dirent } from 'node:fs'
import type { Plugin } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { PageData } from '../../../core/site'
import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { stringifyJsonForScript } from '../../../core/json'

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
}

export function virtualPagesPlugin(options: VirtualPagesOptions): Plugin {
  return {
    name: 'kawapress:virtual-pages',
    resolveId(id) {
      if (id === MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id === RESOLVED_ID) {
        return generatePagesModule(options)
      }
    },
    handleHotUpdate(context) {
      if (!isMarkdownFile(
        context.file,
        options.pageLoader.sourceRoot,
        resolve(options.pageLoader.sourceRoot, options.publicDir),
      )) {
        return
      }

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
  const pageData = await loadPageData(options)
  const serializedPageData = stringifyJsonForScript(pageData, {
    label: 'the page data index',
    path: 'pages',
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

export const pageData = ${serializedPageData}
`
}

async function loadPageData(
  options: VirtualPagesOptions,
): Promise<Record<string, PageData>> {
  const files = await findMarkdownFiles(
    options.pageLoader.sourceRoot,
    resolve(options.pageLoader.sourceRoot, options.publicDir),
  )
  const entries = await Promise.all(files.map(async (file) => {
    const source = await readFile(file, 'utf8')
    const { pageData } = await options.pageLoader.load(source, file)
    return [pageData.path, pageData] as const
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
