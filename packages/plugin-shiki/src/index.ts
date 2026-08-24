import type {
  TransformerTwoslashOptions,
} from '@shikijs/twoslash'
import type { KawaPressPlugin } from 'kawapress'
import type { ShikiTransformer } from 'shiki'
import { createTransformerFactory } from '@shikijs/twoslash'
import { definePlugin } from 'kawapress'
import { createHighlighter } from 'shiki'
import { createTwoslasher } from 'twoslash-vue'
import { rendererFloatingVue } from './renderer-floating-vue'

export type TwoslashOptions = Omit<
  TransformerTwoslashOptions,
  'renderer' | 'twoslasher'
>

export interface ShikiPluginOptions {
  theme?: string
  langs?: string[]
  transformers?: ShikiTransformer[]
  twoslash?: boolean | TwoslashOptions
}

const V_PRE_TRANSFORMER_NAME = 'kawapress:v-pre'
const RUNTIME_DEPENDENCIES = ['floating-vue']
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
  const transformers = createTransformers(options)

  return definePlugin({
    name: '@kawapress/plugin-shiki',
    setup(api) {
      api.markdown(async (markdown) => {
        const highlighter = await createHighlighter({
          themes: [theme],
          langs: options.langs ?? PRELOADED_LANGS,
        })
        markdown.options.highlight = (str, lang, attrs) =>
          highlightCode(highlighter, str, lang, attrs, theme, transformers)
      })
      api.vite((config) => {
        const noExternal = config.ssr?.noExternal
        if (noExternal === true) {
          return
        }

        config.ssr ??= {}
        config.ssr.noExternal = [
          ...(Array.isArray(noExternal)
            ? noExternal
            : noExternal ? [noExternal] : []),
          ...RUNTIME_DEPENDENCIES,
        ]
      })
    },
  })
}

export default shikiPlugin

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>

function createTransformers(
  options: ShikiPluginOptions,
): ShikiTransformer[] {
  const transformers: ShikiTransformer[] = [createVPreTransformer()]

  if (options.twoslash) {
    const twoslashOptions = options.twoslash === true
      ? {}
      : options.twoslash
    transformers.push(createTwoslashTransformer(twoslashOptions))
  }

  transformers.push(...(options.transformers ?? []))
  return transformers
}

function createVPreTransformer(): ShikiTransformer {
  return {
    name: V_PRE_TRANSFORMER_NAME,
    pre(node) {
      node.properties['v-pre'] = ''
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
    preprocess(code, context) {
      const result = transformer.preprocess?.call(this, code, context)
      if (this.meta.twoslash) {
        const vPre = context.transformers?.find(
          item => item.name === V_PRE_TRANSFORMER_NAME,
        )
        if (vPre) {
          context.transformers?.splice(context.transformers.indexOf(vPre), 1)
        }
      }
      return result
    },
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
  theme: string,
  transformers: ShikiTransformer[],
): string {
  const langName = (lang || 'txt').toLowerCase()
  const loaded = highlighter.getLoadedLanguages().includes(langName)
  return highlighter.codeToHtml(str.trimEnd(), {
    lang: loaded ? langName : 'txt',
    theme,
    transformers,
    meta: { __raw: attrs },
  })
}
