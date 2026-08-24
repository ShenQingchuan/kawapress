import type { Dirent } from 'node:fs'
import type { Plugin } from 'vite'
import type { SidebarMeta, SidebarMetaEntry, SidebarMetaItem } from './sidebar'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { parseJson, stringifyJson } from 'kawapress'

export const SIDEBAR_META_MODULE_ID = 'virtual:kawapress-nagi-sidebar-meta'
const RESOLVED_ID = `\0${SIDEBAR_META_MODULE_ID}`
const META_FILE_NAME = '_meta.json'
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules'])

export function nagiSidebarMetaPlugin(srcDir: string): Plugin {
  let sourceRoot = resolve(srcDir)

  return {
    name: 'kawapress:nagi-sidebar-meta',
    configResolved(config) {
      sourceRoot = resolve(config.root, srcDir)
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
      const meta = await loadSidebarMeta(sourceRoot)
      return `export const sidebarMeta = ${stringifyJson(meta, {
        label: 'nagi sidebar metadata',
        path: 'sidebarMeta',
      })}`
    },
    handleHotUpdate(context) {
      if (!isMetaFile(context.file, sourceRoot)) {
        return
      }
      const module = context.server.moduleGraph.getModuleById(RESOLVED_ID)
      if (module) {
        context.server.moduleGraph.invalidateModule(module)
        return [...context.modules, module]
      }
    },
  }
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
