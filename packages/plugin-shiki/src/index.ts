import type {
  TransformerTwoslashOptions,
} from '@shikijs/twoslash'
import type { KawaPressPlugin, PageComponentEnv } from 'kawapress'
import type { ShikiTransformer } from 'shiki'
import { createRequire } from 'node:module'
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers'
import { createTransformerFactory } from '@shikijs/twoslash'
import { addPageComponent, definePlugin } from 'kawapress'
import { useRuntimeDependencies } from 'kawapress/generator'
import { createHighlighter } from 'shiki'
import { createTwoslasher } from 'twoslash-vue'
import { rendererFloatingVue, TWOSLASH_MENU_TAG } from './renderer-floating-vue'

export type TwoslashOptions = Omit<
  TransformerTwoslashOptions,
  'renderer' | 'twoslasher'
>

interface ShikiPluginBaseOptions {
  langs?: string[]
  transformers?: ShikiTransformer[]
  twoslash?: boolean | TwoslashOptions
}

export interface ShikiThemePair extends Record<string, string> {
  light: string
  dark: string
}

export type ShikiPluginOptions = ShikiPluginBaseOptions & (
  | { theme?: string, themes?: never }
  | { theme?: never, themes: ShikiThemePair }
)

const require = createRequire(import.meta.url)

const PLUGIN_NAME = '@kawapress/plugin-shiki'
const V_PRE_TRANSFORMER_NAME = 'kawapress:v-pre'
const RUNTIME_DEPENDENCIES = ['floating-vue']
const TWOSLASH_MENU_COMPONENT = 'KawaTwoslashMenu'
const TWOSLASH_MENU_MODULE = resolveTwoslashMenuModule()
const TWOSLASH_LANGS = ['ts', 'tsx', 'js', 'jsx', 'json', 'vue']
const PRELOADED_LANGS = [
  'bash',
  'css',
  'diff',
  'html',
  'js',
  'json',
  'jsx',
  'md',
  'shell',
  'ts',
  'tsx',
  'vue',
  'yaml',
]

export function shikiPlugin(options: ShikiPluginOptions = {}): KawaPressPlugin {
  const theme = options.theme ?? 'github-light'
  const themes = options.themes
  const transformers = createTransformers(options)

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.markdown(async (markdown) => {
        const highlighter = await createHighlighter({
          themes: themes ? Object.values(themes) : [theme],
          langs: options.langs ?? PRELOADED_LANGS,
        })
        markdown.options.highlight = (str, lang, attrs, env) =>
          highlightCode(highlighter, str, lang, attrs, env, {
            theme,
            themes,
          }, transformers)
      })
      api.vite((config) => {
        useRuntimeDependencies(config, PLUGIN_NAME, RUNTIME_DEPENDENCIES)
      })
    },
  })
}

export default shikiPlugin

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>

/**
 * Absolute path of the module that default-exports the Twoslash menu.
 *
 * The page SFC imports it, and a page cannot resolve a package that only the
 * preset depends on, so the export map is resolved from this package instead of
 * relying on the package manager layout of the site.
 */
function resolveTwoslashMenuModule(): string {
  const specifier = '@kawapress/plugin-shiki/twoslash-menu'
  try {
    return require.resolve(specifier)
  }
  catch {
    return specifier
  }
}

function createTransformers(
  options: ShikiPluginOptions,
): ShikiTransformer[] {
  const transformers: ShikiTransformer[] = [
    transformerMetaHighlight(),
    transformerNotationDiff(),
    transformerNotationFocus({
      classActiveLine: 'has-focus',
      classActivePre: 'has-focused-lines',
    }),
    transformerNotationHighlight(),
    transformerNotationErrorLevel(),
    createSemanticAnnotationTransformer(),
    createVPreTransformer(),
  ]

  if (options.twoslash) {
    const twoslashOptions = options.twoslash === true
      ? {}
      : options.twoslash
    transformers.push(createTwoslashTransformer(twoslashOptions))
  }

  transformers.push(...(options.transformers ?? []))
  transformers.push(createRenderedLineCountTransformer())
  return transformers
}

function createSemanticAnnotationTransformer(): ShikiTransformer {
  return {
    name: 'kawapress:semantic-code-annotations',
    code(node) {
      for (const child of node.children) {
        if (child.type !== 'element') {
          continue
        }
        const classes = child.properties.class
        const classNames = new Set(Array.isArray(classes)
          ? classes.map(String)
          : classes ? [String(classes)] : [])
        if (!classNames.has('line')) {
          continue
        }
        if (classNames.has('diff') && classNames.has('remove')) {
          child.tagName = 'del'
        }
        else if (classNames.has('diff') && classNames.has('add')) {
          child.tagName = 'ins'
        }
        else if (classNames.has('highlighted') || classNames.has('has-focus')) {
          child.tagName = 'mark'
        }
      }
    },
  }
}

function createRenderedLineCountTransformer(): ShikiTransformer {
  return {
    name: 'kawapress:rendered-line-count',
    code(node) {
      const lineCount = node.children.filter((child) => {
        if (child.type !== 'element') {
          return false
        }
        const classes = child.properties.class
        return Array.isArray(classes)
          ? classes.map(String).includes('line')
          : typeof classes === 'string'
            && classes.split(/\s+/).includes('line')
      }).length
      this.pre.properties['data-kawa-line-count'] = Math.max(1, lineCount)
    },
  }
}

function createVPreTransformer(): ShikiTransformer {
  return {
    name: V_PRE_TRANSFORMER_NAME,
    pre(node) {
      if (!this.meta.twoslash) {
        node.properties['v-pre'] = ''
      }
    },
  }
}

function createTwoslashTransformer(
  options: TwoslashOptions,
): ShikiTransformer {
  const transformer = createTransformerFactory(
    createTwoslasher(options.twoslashOptions),
    rendererFloatingVue(),
  )({
    langs: TWOSLASH_LANGS,
    ...options,
    explicitTrigger: options.explicitTrigger ?? true,
  })

  return {
    ...transformer,
    name: 'kawapress:twoslash',
    postprocess(html) {
      if (this.meta.twoslash) {
        return html.replaceAll('{', '&#123;')
      }
      return html
    },
  }
}

function highlightCode(
  highlighter: Highlighter,
  str: string,
  lang: string,
  attrs: string,
  env: PageComponentEnv,
  themeOptions: {
    theme: string
    themes?: ShikiThemePair
  },
  transformers: ShikiTransformer[],
): string {
  const langName = (lang || 'txt').toLowerCase()
  const loaded = highlighter.getLoadedLanguages().includes(langName)
  const commonOptions = {
    lang: loaded ? langName : 'txt',
    transformers,
    meta: { __raw: attrs },
  }

  const code = str.replace(/\r?\n$/, '')
  const html = themeOptions.themes
    ? highlighter.codeToHtml(code, {
        ...commonOptions,
        themes: themeOptions.themes,
        defaultColor: 'light-dark()',
      })
    : highlighter.codeToHtml(code, {
        ...commonOptions,
        theme: themeOptions.theme,
      })

  declareTwoslashMenu(env, html)
  return html
}

/**
 * A page only imports the menu component when a code block really rendered one,
 * so pages without Twoslash never download floating-vue.
 */
function declareTwoslashMenu(env: PageComponentEnv, html: string): void {
  if (!html.includes(`<${TWOSLASH_MENU_TAG}`)) {
    return
  }
  addPageComponent(env, {
    name: TWOSLASH_MENU_COMPONENT,
    from: TWOSLASH_MENU_MODULE,
  })
}
