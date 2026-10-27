import type { LocaleConfig } from 'kawapress'
import type { Dirent } from 'node:fs'
import type { HmrContext, ModuleNode, Plugin, ViteDevServer } from 'vite'
import type { SidebarMeta, SidebarMetaEntry, SidebarMetaItem, SidebarPages } from './sidebar'
import type { SidebarPageReader, SidebarPageScope } from './sidebar-pages'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { parseJson, stringifyJson } from 'kawapress'
import { isMarkdownPage, markdownFileToRoutePath } from 'kawapress/generator'
import { createSidebarPageReader } from './sidebar-pages'

export const SIDEBAR_META_MODULE_ID = 'virtual:kawapress-nagi-sidebar-meta'
const RESOLVED_ID = `\0${SIDEBAR_META_MODULE_ID}`
const META_FILE_NAME = '_meta.json'
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules'])

export interface NagiSidebarMetaPluginOptions {
  /** `srcDir` of the site config, relative to the site root. */
  srcDir: string
  /** `themeConfig` of the site config; only `sidebar` is read. */
  themeConfig?: object | undefined
  /** `locales` of the site config, which can each declare their own sidebar. */
  locales?: Record<string, LocaleConfig<object>> | undefined
}

export function nagiSidebarMetaPlugin(options: NagiSidebarMetaPluginOptions): Plugin {
  let scope: SidebarPageScope = { sourceRoot: resolve(options.srcDir) }
  /**
   * Page list of the module as the browser last received it, so editing a page
   * only refreshes the browser when the sidebar would show something else.
   */
  let pages: SidebarPages | undefined
  const pageReader: SidebarPageReader = createSidebarPageReader(() => scope)
  const isPage = (file: string) => isMarkdownPage(file, scope)
  /**
   * The module and the fresh copy that replaces it. Returning them lets Vite
   * re-run the module; a browser that never asked for it needs no update.
   */
  const hotUpdate = (
    context: HmrContext,
    server: ViteDevServer,
  ): ModuleNode[] | undefined => {
    const virtualModule = invalidateModule(server)
    return virtualModule && [...context.modules, virtualModule]
  }

  return {
    name: 'kawapress:nagi-sidebar-meta',
    configResolved(config) {
      scope = {
        sourceRoot: resolve(config.root, options.srcDir),
        publicDir: config.publicDir ? resolve(config.publicDir) : undefined,
        themeConfig: options.themeConfig,
        locales: options.locales,
      }
      pages = undefined
    },
    resolveId(id) {
      if (id === SIDEBAR_META_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id !== RESOLVED_ID) {
        return
      }
      const meta = await loadSidebarMeta(scope.sourceRoot)
      pages = await pageReader.readAll()
      return renderSidebarMetaModule(meta, pages)
    },
    configureServer(server) {
      // A page that is added or removed is in no module the browser knows
      // about, so the watcher has to report it and the browser has to ask the
      // server for the whole page again.
      for (const event of ['add', 'unlink'] as const) {
        server.watcher.on(event, (file: string) => {
          if (!isPage(file)) {
            return
          }
          pages = undefined
          if (invalidateModule(server)) {
            server.hot.send({ type: 'full-reload' })
          }
        })
      }
    },
    async handleHotUpdate(context) {
      if (isMetaFile(context.file, scope.sourceRoot)) {
        return hotUpdate(context, context.server)
      }
      if (!isPage(context.file) || !pages) {
        return
      }

      const routePath = markdownFileToRoutePath(context.file, scope.sourceRoot)
      if (isSameEntry(pages[routePath], await pageReader.readChanged(context.file))) {
        return
      }

      pages = undefined
      return hotUpdate(context, context.server)
    },
  }
}

function isSameEntry(
  previous: SidebarPages[string] | undefined,
  next: SidebarPages[string] | undefined,
): boolean {
  return previous?.title === next?.title && previous?.layout === next?.layout
}

/**
 * Marks the module stale and returns it when the dev server holds a copy, which
 * is the case as soon as a browser asked for it.
 */
function invalidateModule(server: ViteDevServer): ModuleNode | undefined {
  const virtualModule = server.moduleGraph.getModuleById(RESOLVED_ID)
  if (!virtualModule) {
    return
  }
  server.moduleGraph.invalidateModule(virtualModule)
  return virtualModule
}

function renderSidebarMetaModule(meta: SidebarMeta, pages: SidebarPages): string {
  return [
    `export const sidebarMeta = ${stringifyJson(meta, {
      label: 'nagi sidebar metadata',
      path: 'sidebarMeta',
    })}`,
    `export const sidebarPages = ${stringifyJson(pages, {
      label: 'nagi sidebar pages',
      path: 'sidebarPages',
    })}`,
    '',
  ].join('\n')
}

export async function loadSidebarMeta(sourceRoot: string): Promise<SidebarMeta> {
  const files = await findMetaFiles(sourceRoot)
  const entries = await Promise.all(files.map(async (file) => {
    const value = parseJson<unknown>(await readFile(file, 'utf8'), {
      label: `nagi sidebar metadata at ${JSON.stringify(file)}`,
    })
    return [directoryToRoute(dirname(file), sourceRoot), parseMeta(value, file)]
  }))
  return Object.fromEntries(entries)
}

function parseMeta(value: unknown, file: string): SidebarMetaItem[] {
  if (!Array.isArray(value)) {
    throw metaError(file, 'the root value must be an array')
  }

  const names = new Set<string>()
  return value.map((item, index) => {
    const parsed = parseMetaItem(item, file, index)
    const name = typeof parsed === 'string' ? parsed : parsed.name
    if (names.has(name)) {
      throw metaError(file, `item ${index} duplicates ${JSON.stringify(name)}`)
    }
    names.add(name)
    return parsed
  })
}

function parseMetaItem(
  value: unknown,
  file: string,
  index: number,
): SidebarMetaItem {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw metaError(file, `item ${index} must be a non-empty string or object`)
  }

  const item = value as Record<string, unknown>
  if (item.type !== 'file' && item.type !== 'dir') {
    throw metaError(file, `item ${index}.type must be "file" or "dir"`)
  }
  if (typeof item.name !== 'string' || item.name.length === 0) {
    throw metaError(file, `item ${index}.name must be a non-empty string`)
  }
  if (item.label !== undefined && typeof item.label !== 'string') {
    throw metaError(file, `item ${index}.label must be a string`)
  }

  const parsed: SidebarMetaEntry = {
    type: item.type,
    name: item.name,
  }
  if (item.label !== undefined) {
    parsed.label = item.label
  }
  return parsed
}

async function findMetaFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries
    .sort(compareEntries)
    .filter(entry => !shouldIgnore(entry))
    .map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        return findMetaFiles(path)
      }
      return entry.isFile() && entry.name === META_FILE_NAME ? [path] : []
    }))
  return files.flat()
}

function directoryToRoute(directory: string, sourceRoot: string): string {
  const path = relative(sourceRoot, directory).split(sep).join('/')
  return path ? `/${path}` : '/'
}

function isMetaFile(file: string, sourceRoot: string): boolean {
  const relativePath = relative(sourceRoot, file)
  return basename(file) === META_FILE_NAME
    && !isAbsolute(relativePath)
    && relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
}

function compareEntries(a: Dirent, b: Dirent): number {
  return a.name.localeCompare(b.name)
}

function shouldIgnore(entry: Dirent): boolean {
  return entry.name.startsWith('.')
    || (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name))
}

function metaError(file: string, message: string): TypeError {
  return new TypeError(`KawaPress: invalid nagi sidebar metadata at ${JSON.stringify(file)}; ${message}.`)
}
