import type { KawaPressPlugin } from 'kawapress'
import type { ImageZoomLabels, ImageZoomPluginOptions } from './labels'
import type { ImageZoomLocaleLanguages } from './locale'
import { definePlugin } from 'kawapress'
import { createImageZoomLabelResolver, formatImageZoomLabel } from './labels'
import { resolveLocaleLanguages } from './locale'
import { installImageZoom } from './markdown'
import { imageZoomOptionsPlugin } from './options-module'

export type { ImageZoomLabels, ImageZoomPluginOptions }
export { formatImageZoomLabel, installImageZoom }

const DEFAULT_LOCALE_LANGUAGES: ImageZoomLocaleLanguages = { root: 'en' }

export function imageZoomPlugin(
  options: ImageZoomPluginOptions = {},
): KawaPressPlugin {
  let localeLanguages = DEFAULT_LOCALE_LANGUAGES

  return definePlugin({
    name: '@kawapress/plugin-image-zoom',
    setup(api) {
      api.config((config) => {
        localeLanguages = resolveLocaleLanguages(config.locales)
      })
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(imageZoomOptionsPlugin({
          labels: options.labels ?? {},
          localeLabels: options.localeLabels ?? {},
          localeLanguages,
        }))
      })
      api.markdown((markdown) => {
        installImageZoom(markdown, {
          resolveLabels: createImageZoomLabelResolver({
            ...options,
            localeLanguages,
          }),
        })
      })
    },
  })
}

export default imageZoomPlugin
