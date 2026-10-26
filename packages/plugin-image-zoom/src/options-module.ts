import type { Plugin } from 'vite'
import type { ImageZoomLabels } from './labels'
import type { ImageZoomLocaleLanguages } from './locale'
import { stringifyJson } from 'kawapress'

export const IMAGE_ZOOM_OPTIONS_MODULE_ID = 'virtual:kawapress-image-zoom-options'
const RESOLVED_MODULE_ID = `\0${IMAGE_ZOOM_OPTIONS_MODULE_ID}`

/**
 * What the runtime plugin needs to know about the site. It is JSON only: the
 * two sides of a plugin never share module state.
 */
export interface ImageZoomRuntimeOptions {
  labels: Partial<ImageZoomLabels>
  localeLabels: Record<string, Partial<ImageZoomLabels>>
  localeLanguages: ImageZoomLocaleLanguages
}

/**
 * Exposes the generator-side options to the browser as a virtual module, so a
 * label override in `kawapress.config.ts` also drives the runtime dialog.
 */
export function imageZoomOptionsPlugin(options: ImageZoomRuntimeOptions): Plugin {
  return {
    name: 'kawapress:image-zoom-options',
    resolveId(id) {
      if (id === IMAGE_ZOOM_OPTIONS_MODULE_ID) {
        return RESOLVED_MODULE_ID
      }
    },
    load(id) {
      if (id !== RESOLVED_MODULE_ID) {
        return
      }
      return `export const imageZoomOptions = ${stringifyJson(options, {
        label: 'the options of @kawapress/plugin-image-zoom',
        path: 'imageZoom',
      })}`
    },
  }
}
