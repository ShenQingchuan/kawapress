import type {
  EnvironmentModuleNode,
  Plugin,
  ViteDevServer,
} from 'vite'
import type { DataLoader } from '../../../api/data'
import type { InternalDataLoaderContext } from '../../data/context'
import { dirname, relative, resolve } from 'node:path'
import {
  normalizePath,
  runnerImport,
} from 'vite'
import {
  getContentLoaderSpecification,
  installContentLoaderExecutor,
} from '../../../api/data'
import { createContentLoaderExecutor } from '../../../compiler/content-loader'
import { stringifyJsonForScript } from '../../../core/json'
import { installDataLoaderContext } from '../../data/context'
import {
  findDataLoaderFiles,
  normalizeDataLoaderGlob,
} from '../../data/glob'

const DATA_LOADER_RE = /\.data\.[cm]?[jt]s(?:$|\?)/

interface LoadedDataLoader {
  dependencies: Set<string>
  loader: DataLoader
  watch: string[]
  watchedFiles: string[]
}

interface CachedHotUpdate {
  key: string
  affectedIds: Promise<string[]>
}

export function dataLoaderPlugin(
  context: InternalDataLoaderContext,
): Plugin {
  installDataLoaderContext(context)
  installContentLoaderExecutor(createContentLoaderExecutor(context))

  const loaders = new Map<string, LoadedDataLoader>()
  const output = new Map<string, Promise<string>>()
  let server: ViteDevServer | undefined
  let cachedHotUpdate: CachedHotUpdate | undefined

  const loadDataLoader = async (id: string): Promise<LoadedDataLoader> => {
    const cached = loaders.get(id)
    if (cached) {
      return cached
    }

    const file = cleanDataLoaderId(id)
    const loaded = await runnerImport<{ default?: unknown }>(file, {
      root: context.root,
      resolve: {
        conditions: ['module'],
      },
      ssr: {
        noExternal: ['kawapress', /^@kawapress\//],
      },
    })
    const loader = resolveDataLoader(loaded.module.default, file)
    const contentLoader = getContentLoaderSpecification(loader)
    const watch = normalizeDataLoaderGlob(
      loader.watch,
      contentLoader ? context.srcDir : dirname(file),
    )
    const watchedFiles = await findDataLoaderFiles(
      watch,
      loader.options?.globOptions,
    )
    const dependencies = new Set([
      normalizePath(file),
      ...loaded.dependencies.map(dependency => normalizePath(resolve(dependency))),
    ])
    const result = { dependencies, loader, watch, watchedFiles }
    loaders.set(id, result)
    server?.watcher.add([...dependencies, ...watchedFiles])
    return result
  }

  const generateDataModule = async (id: string): Promise<string> => {
    const loaded = await loadDataLoader(id)
    const data = await loaded.loader.load(loaded.watchedFiles)
    const serialized = stringifyJsonForScript(data, {
      label: `data returned by loader ${JSON.stringify(displayLoaderPath(id, context.root))}`,
      path: 'data',
    })
    return `export const data = ${serialized}\n`
  }

  const loadDataModule = (id: string): Promise<string> => {
    const cached = output.get(id)
    if (cached) {
      return cached
    }

    const pending = generateDataModule(id).catch((cause) => {
      output.delete(id)
      throw dataLoaderError(id, context.root, cause)
    })
    output.set(id, pending)
    return pending
  }

  const findAffectedLoaders = async (file: string): Promise<string[]> => {
    const normalizedFile = normalizePath(file)
    const checks = await Promise.all([...loaders].map(async ([id, loaded]) => {
      const dependencyChanged = loaded.dependencies.has(normalizedFile)
      let watchChanged = false

      if (loaded.watch.length > 0) {
        const nextFiles = await findDataLoaderFiles(
          loaded.watch,
          loaded.loader.options?.globOptions,
        )
        watchChanged = loaded.watchedFiles.includes(normalizedFile)
          || nextFiles.includes(normalizedFile)
        loaded.watchedFiles = nextFiles
      }

      return { dependencyChanged, id, watchChanged }
    }))

    const affectedIds: string[] = []
    for (const check of checks) {
      if (!check.dependencyChanged && !check.watchChanged) {
        continue
      }
      affectedIds.push(check.id)
      output.delete(check.id)
      if (check.dependencyChanged) {
        loaders.delete(check.id)
      }
    }
    return affectedIds
  }

  return {
    name: 'kawapress:data-loader',
    configureServer(viteServer) {
      server = viteServer
    },
    load(id) {
      if (!DATA_LOADER_RE.test(id)) {
        return null
      }
      return loadDataModule(id)
    },
    async hotUpdate(options) {
      const key = `${options.timestamp}:${options.type}:${normalizePath(options.file)}`
      if (cachedHotUpdate?.key !== key) {
        cachedHotUpdate = {
          key,
          affectedIds: findAffectedLoaders(options.file),
        }
      }

      const affectedIds = await cachedHotUpdate.affectedIds
      if (affectedIds.length === 0) {
        return
      }

      const affectedModules = affectedIds
        .map(id => this.environment.moduleGraph.getModuleById(id))
        .filter((module): module is EnvironmentModuleNode => module !== undefined)
      return uniqueModules([...options.modules, ...affectedModules])
    },
  }
}

function resolveDataLoader(value: unknown, file: string): DataLoader {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(
      `data loader ${JSON.stringify(file)} must default-export an object`,
    )
  }
  if (!('load' in value) || typeof value.load !== 'function') {
    throw new TypeError(
      `data loader ${JSON.stringify(file)} must provide a load() function`,
    )
  }
  if ('watch' in value
    && value.watch !== undefined
    && typeof value.watch !== 'string'
    && !(Array.isArray(value.watch)
      && value.watch.every(pattern => typeof pattern === 'string'))) {
    throw new TypeError(
      `data loader ${JSON.stringify(file)} watch must be a string or string array`,
    )
  }
  return value as unknown as DataLoader
}

function cleanDataLoaderId(id: string): string {
  return id.replace(/\?.*$/, '')
}

function displayLoaderPath(id: string, root: string): string {
  const file = cleanDataLoaderId(id)
  const path = relative(root, file)
  return path && !path.startsWith('..') ? normalizePath(path) : normalizePath(file)
}

function dataLoaderError(id: string, root: string, cause: unknown): Error {
  const detail = cause instanceof Error ? `\n${cause.message}` : ''
  return new Error(
    `KawaPress: data loader ${JSON.stringify(displayLoaderPath(id, root))} failed.${detail}`,
    { cause },
  )
}

function uniqueModules(
  modules: EnvironmentModuleNode[],
): EnvironmentModuleNode[] {
  return [...new Set(modules)]
}
