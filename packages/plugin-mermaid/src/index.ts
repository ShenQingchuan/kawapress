import type { KawaPressPlugin, LocaleConfig } from 'kawapress'
import type { MermaidView } from './fence'
import type { MermaidLabelOptions, MermaidLabels, MermaidLocaleLanguages } from './labels'
import { createRequire } from 'node:module'
import { addPageComponent, definePlugin } from 'kawapress'
import { useRuntimeDependencies } from 'kawapress/generator'
import { installMermaid, parseMermaidInfo } from './fence'
import { resolveMermaidLabels } from './labels'

export interface MermaidPluginOptions extends MermaidLabelOptions {
  /** View a diagram starts in. A fence can override it: ```` ```mermaid split ````. */
  defaultView?: MermaidView
}

export type { MermaidLabelOptions, MermaidLabels, MermaidView }
export { installMermaid, parseMermaidInfo }

const PLUGIN_NAME = '@kawapress/plugin-mermaid'
const COMPONENT_NAME = 'KawaMermaid'
const RUNTIME_DEPENDENCIES = ['pele/lazy']
const DEFAULT_LOCALE_LANGUAGES: MermaidLocaleLanguages = { root: 'en' }
const COMPONENT_MODULE = resolveComponentModule()

export function mermaidPlugin(
  options: MermaidPluginOptions = {},
): KawaPressPlugin {
  let localeLanguages = DEFAULT_LOCALE_LANGUAGES

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.config((config) => {
        localeLanguages = resolveLocaleLanguages(config.locales)
      })
      api.vite((config) => {
        useRuntimeDependencies(config, PLUGIN_NAME, RUNTIME_DEPENDENCIES)
      })
      api.markdown((markdown) => {
        installMermaid(markdown, {
          defaultView: options.defaultView,
          resolveLabels: path => resolveMermaidLabels(path, localeLanguages, options),
          // A page only imports the component when it really has a diagram, so
          // other pages never download it.
          onDiagram: env => addPageComponent(env, {
            name: COMPONENT_NAME,
            from: COMPONENT_MODULE,
          }),
        })
      })
    },
  })
}

export default mermaidPlugin

function resolveLocaleLanguages(
  locales: Record<string, LocaleConfig> | undefined,
): MermaidLocaleLanguages {
  return Object.fromEntries(
    Object.entries(locales ?? {}).map(([index, locale]) => [index, locale.lang]),
  )
}

/**
 * Absolute path of the module that default-exports the page component, so Vite
 * resolves it no matter which package the site installed.
 */
function resolveComponentModule(): string {
  const specifier = `${PLUGIN_NAME}/diagram`
  try {
    return createRequire(import.meta.url).resolve(specifier)
  }
  catch {
    return specifier
  }
}
