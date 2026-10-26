import type { Plugin } from 'vite'
import type {
  LastUpdatedPluginOptions,
  LastUpdatedRuntimeOptions,
} from './types'
import { stringifyJson } from 'kawapress'

export const LAST_UPDATED_OPTIONS_MODULE_ID = 'virtual:kawapress-last-updated-options'
const RESOLVED_ID = `\0${LAST_UPDATED_OPTIONS_MODULE_ID}`

/**
 * Keeps only what the browser needs. `editLink.text` becomes the weakest link
 * text so the localized overrides above it keep their precedence.
 */
export function createRuntimeOptions(
  options: LastUpdatedPluginOptions,
): LastUpdatedRuntimeOptions {
  const labels = defined({
    editLink: options.editLink?.text,
    ...options.labels,
  })

  return defined({
    formatOptions: options.lastUpdated?.formatOptions,
    labels: Object.keys(labels).length > 0 ? labels : undefined,
    localeLabels: options.localeLabels,
  })
}

/**
 * Exposes the plugin options as a virtual module, so the runtime component
 * never imports generator code or shares module state with it.
 */
export function lastUpdatedOptionsPlugin(
  options: LastUpdatedRuntimeOptions,
): Plugin {
  return {
    name: 'kawapress:last-updated-options',
    resolveId(id) {
      if (id === LAST_UPDATED_OPTIONS_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    load(id) {
      if (id !== RESOLVED_ID) {
        return
      }
      return `export const lastUpdatedOptions = ${stringifyJson(options, {
        label: 'the @kawapress/plugin-last-updated options passed to the runtime',
        path: 'lastUpdatedOptions',
      })}`
    },
  }
}

function defined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T
}
