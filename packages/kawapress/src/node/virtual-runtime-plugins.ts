import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { findPackageJSON } from 'node:module'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const RUNTIME_PLUGINS_MODULE_ID = 'virtual:kawapress-runtime-plugins'
const RESOLVED_ID = `\0${RUNTIME_PLUGINS_MODULE_ID}`

export interface VirtualRuntimePluginsOptions {
  pluginNames: string[]
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

      const imports: string[] = []
      const bindings: string[] = []

      for (const [index, pluginName] of options.pluginNames.entries()) {
        if (!(await hasRuntimePluginExport(pluginName, root))) {
          continue
        }

        const runtimeEntry = `${pluginName}/runtime-plugin`
        const resolved = await this.resolve(runtimeEntry, undefined, {
          skipSelf: true,
        })
        if (!resolved) {
          throw new Error(`KawaPress: cannot resolve ${JSON.stringify(runtimeEntry)}`)
        }

        const binding = `runtimePlugin${index}`
        imports.push(`import ${binding} from ${JSON.stringify(runtimeEntry)}`)
        bindings.push(binding)
      }

      return [
        ...imports,
        `export const runtimePlugins = [${bindings.join(', ')}]`,
      ].join('\n')
    },
  }
}

async function hasRuntimePluginExport(
  pluginName: string,
  root: string,
): Promise<boolean> {
  let packagePath: string | undefined
  try {
    packagePath = findPackageJSON(
      pluginName,
      pathToFileURL(`${root}/`),
    )
  }
  catch {
    return false
  }
  if (!packagePath) {
    return false
  }

  const packageJson = JSON.parse(
    await readFile(packagePath, 'utf8'),
  ) as { exports?: unknown }

  return typeof packageJson.exports === 'object'
    && packageJson.exports !== null
    && Object.hasOwn(packageJson.exports, './runtime-plugin')
}
