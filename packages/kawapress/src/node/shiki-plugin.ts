import type { ShikiTransformer } from 'shiki'
import type { KawaPressPlugin } from '../plugin-api'
import { createHighlighter } from 'shiki'
import { definePlugin } from '../plugin-api'

export interface ShikiPluginOptions {
  theme?: string
  langs?: string[]
  transformers?: ShikiTransformer[]
}

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
  const transformers = options.transformers ?? []

  return definePlugin({
    name: 'kawapress:shiki',
    setup(api) {
      api.markdown(async (markdown) => {
        const highlighter = await createHighlighter({
          themes: [theme],
          langs: options.langs ?? PRELOADED_LANGS,
        })
        markdown.options.highlight = (str, lang, attrs) =>
          highlightCode(highlighter, str, lang, attrs, theme, transformers)
      })
    },
  })
}

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>

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
  const { code, restore } = escapeMustaches(str.trimEnd())
  const html = highlighter.codeToHtml(code, {
    lang: loaded ? langName : 'txt',
    theme,
    transformers,
    meta: { __raw: attrs },
  })
  return restore(html)
}

// protect {{ }} interpolations from vue's template compiler (the rendered html
// becomes a vue template); same approach as vitepress
function escapeMustaches(str: string): {
  code: string
  restore: (s: string) => string
} {
  const mustaches = new Map<string, string>()
  const code = str.replace(/\{\{.*?\}\}/g, (match) => {
    let marker = mustaches.get(match)
    if (!marker) {
      marker = `__KAWA_MUSTACHE_${mustaches.size}__`
      mustaches.set(match, marker)
    }
    return marker
  })
  return {
    code,
    restore: (s) => {
      mustaches.forEach((marker, match) => {
        s = s.replaceAll(marker, match)
      })
      return s
    },
  }
}
