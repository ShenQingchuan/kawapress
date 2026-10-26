import type { Plugin } from 'vite'
import type { ResolvedCommentsOptions } from './options'
import { stringifyJson } from 'kawapress'

export const COMMENTS_OPTIONS_MODULE_ID = 'virtual:kawapress-comments-options'

const RESOLVED_MODULE_ID = `\0${COMMENTS_OPTIONS_MODULE_ID}`

/**
 * Publishes the plugin options to the browser as plain JSON. The runtime half of
 * the plugin must never import this package's generator half.
 */
export function commentsOptionsPlugin(
  options: ResolvedCommentsOptions,
): Plugin {
  return {
    name: 'kawapress:comments-options',
    resolveId(id) {
      if (id === COMMENTS_OPTIONS_MODULE_ID) {
        return RESOLVED_MODULE_ID
      }
    },
    load(id) {
      if (id !== RESOLVED_MODULE_ID) {
        return
      }
      return `export default ${stringifyJson(options, {
        label: 'options of @kawapress/plugin-comments',
        path: 'commentsPlugin',
      })}`
    },
  }
}
