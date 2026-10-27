import type { KawaPressPlugin } from 'kawapress'
import { definePlugin } from 'kawapress'

export const REFERENCE_THEME_NAME = '@kawapress/e2e-reference-theme'

/**
 * Generator side of the reference theme. The theme only renders interface, so
 * this side declares the plugin identity that KawaPress uses to find the
 * `./runtime-plugin` entry of the same package.
 */
export function referenceTheme(): KawaPressPlugin {
  return definePlugin({
    name: REFERENCE_THEME_NAME,
    setup() {},
  })
}

export default referenceTheme
