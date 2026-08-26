import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { findPackageJSON } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { parseJson } from '../../../core/json'

const RUNTIME_PLUGINS_MODULE_ID = 'virtual:kawapress-runtime-plugins'
const RESOLVED_ID = `\0${RUNTIME_PLUGINS_MODULE_ID}`

export interface VirtualRuntimePluginsOptions {
  pluginNames: string[]
}

interface PluginPackage {
  packagePath: string
  exports?: unknown
}

export function virtualRuntimePluginsPlugin(
  options: VirtualRuntimePluginsOptions,
): Plugin {
  let root = process.cwd()

  return {
    name: 'kawapress:virtual-runtime-plugins',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      if (id === RUNTIME_PLUGINS_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id !== RESOLVED_ID) {
        return
      }

      const pluginPackages = await resolvePluginPackages(
        options.pluginNames,
        root,
      )
      const imports: string[] = []
      const bindings: string[] = []

      for (const [index, pluginName] of options.pluginNames.entries()) {
        const pluginPackage = pluginPackages.get(pluginName)
        if (!pluginPackage || !hasRuntimePluginExport(pluginPackage)) {
          continue
        }

        const runtimeEntry = `${pluginName}/runtime-plugin`
        const resolved = await this.resolve(
          runtimeEntry,
          pluginPackage.packagePath,
          { skipSelf: true },
        )
        if (!resolved) {
          throw new Error(`KawaPress: cannot resolve ${JSON.stringify(runtimeEntry)}`)
        }

        const binding = `runtimePlugin${index}`
        imports.push(`import ${binding} from ${JSON.stringify(resolved.id)}`)
        bindings.push(binding)
      }

      return [
        ...imports,
        `export const runtimePlugins = [${bindings.join(', ')}]`,
      ].join('\n')
    },
  }
}

async function resolvePluginPackages(
  pluginNames: string[],
  root: string,
): Promise<Map<string, PluginPackage>> {
  const packages = new Map<string, PluginPackage>()
  const unresolved = new Set(pluginNames)
  const searchRoots = [root]
  const corePackagePath = findPluginPackage('kawapress', searchRoots)
  if (corePackagePath) {
    searchRoots.push(dirname(corePackagePath))
  }
  let foundPackage = true

  while (unresolved.size > 0 && foundPackage) {
    foundPackage = false

    for (const pluginName of unresolved) {
      const packagePath = findPluginPackage(pluginName, searchRoots)
      if (!packagePath) {
        continue
      }

      const packageJson = parseJson<{ exports?: unknown }>(
        await readFile(packagePath, 'utf8'),
        { label: `plugin package metadata at ${JSON.stringify(packagePath)}` },
      )
      packages.set(pluginName, {
        packagePath,
        exports: packageJson.exports,
      })
      searchRoots.push(dirname(packagePath))
      unresolved.delete(pluginName)
      foundPackage = true
    }
  }

  return packages
}

function findPluginPackage(
  pluginName: string,
  searchRoots: string[],
): string | undefined {
  for (const searchRoot of searchRoots) {
    try {
      const packagePath = findPackageJSON(
        pluginName,
        pathToFileURL(join(searchRoot, 'package.json')),
      )
      if (packagePath) {
        return packagePath
      }
    }
    catch {
      // The plugin may use an internal identity and have no package export.
    }
  }
}

function hasRuntimePluginExport(pluginPackage: PluginPackage): boolean {
  return typeof pluginPackage.exports === 'object'
    && pluginPackage.exports !== null
    && Object.hasOwn(pluginPackage.exports, './runtime-plugin')
}
