import type { KawaPressPlugin } from 'kawapress'
import { definePlugin } from 'kawapress'

const RUNTIME_DEPENDENCIES = ['overlayscrollbars-vue']

export function createNagiPlugin(): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/preset-nagi',
    setup(api) {
      api.vite((config) => {
        const noExternal = config.ssr?.noExternal
        if (noExternal !== true) {
          config.ssr ??= {}
          config.ssr.noExternal = [
            ...(Array.isArray(noExternal)
              ? noExternal
              : noExternal ? [noExternal] : []),
            ...RUNTIME_DEPENDENCIES,
          ]
        }
      })
    },
  })
}
