import type {
  KawaPressPlugin,
  LocaleConfig,
} from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { definePlugin } from 'kawapress'

export interface CodeBlockCopyLabels {
  copy: string
  copied: string
}

export interface CodeBlockPluginOptions {
  /** Show line numbers unless a fence opts out with `:no-line-numbers`. */
  lineNumbers?: boolean
  /** Override visible labels for language identifiers. */
  languageLabels?: Record<string, string>
  /** Override copy feedback for every locale. */
  copyLabels?: Partial<CodeBlockCopyLabels>
  /** Override copy feedback for one KawaPress locale key. */
  localeCopyLabels?: Record<string, Partial<CodeBlockCopyLabels>>
}

interface CodeBlockRenderEnv {
  path?: string
}

interface InstallCodeBlockOptions extends CodeBlockPluginOptions {
  resolveCopyLabels?: (env: CodeBlockRenderEnv) => CodeBlockCopyLabels
}

interface FenceInfo {
  language: string
  normalized: string
  lineNumbers: boolean
  startLine: number
}

interface RenderedLineNumbers {
  digits: number
  html: string
}

const ENGLISH_COPY_LABELS: CodeBlockCopyLabels = {
  copy: 'Copy code',
  copied: 'Copied',
}

const CHINESE_COPY_LABELS: CodeBlockCopyLabels = {
  copy: '复制代码',
  copied: '已复制',
}

const DEFAULT_LANGUAGE_LABELS: Record<string, string> = {
  bash: 'Bash',
  css: 'CSS',
  diff: 'Diff',
  html: 'HTML',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  markdown: 'Markdown',
  md: 'Markdown',
  plaintext: 'Text',
  shell: 'Shell',
  sh: 'Shell',
  text: 'Text',
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
  txt: 'Text',
  vue: 'Vue',
  yaml: 'YAML',
  yml: 'YAML',
}

const DEFAULT_LOCALES: Record<string, LocaleConfig> = {
  root: {
    label: 'English',
    lang: 'en',
  },
}

const ATTACHED_LINE_NUMBER_DIRECTIVES_RE
  = /^([\w-]+)((?::(?:no-)?line-numbers(?:=\d+)?)+)(?=\s|$)/
const LINE_NUMBER_DIRECTIVE_RE = /^:(no-)?line-numbers(?:=(\d+))?$/
const LINE_NUMBER_DIRECTIVES_RE = /:(no-)?line-numbers(?:=(\d+))?/g
const STANDALONE_LINE_NUMBER_DIRECTIVE_RE
  = /(^|[\t ])(:(?:no-)?line-numbers(?:=\d+)?)(?=$|[\t ])/g

export function codeBlockPlugin(
  options: CodeBlockPluginOptions = {},
): KawaPressPlugin {
  let locales = DEFAULT_LOCALES

  return definePlugin({
    name: '@kawapress/plugin-code-block',
    setup(api) {
      api.config((config) => {
        locales = config.locales ?? DEFAULT_LOCALES
      })
      api.markdown((markdown) => {
        installCodeBlocks(markdown, {
          ...options,
          resolveCopyLabels: env => resolveCopyLabels(
            env.path ?? '/',
            locales,
            options,
          ),
        })
      })
    },
  })
}

export default codeBlockPlugin

export function installCodeBlocks(
  markdown: MarkdownExit,
  options: InstallCodeBlockOptions = {},
): void {
  const renderFence = markdown.renderer.rules.fence
  const languageLabels = new Map([
    ...Object.entries(DEFAULT_LANGUAGE_LABELS),
    ...Object.entries(normalizeLanguageLabels(options.languageLabels)),
  ])

  markdown.renderer.rules.fence = (tokens, index, renderOptions, env, renderer) => {
    const token = tokens[index]
    const originalInfo = token.info
    const info = parseFenceInfo(originalInfo, options.lineNumbers ?? false)
    token.info = info.normalized

    let rendered: string | Promise<string>
    try {
      rendered = renderFence
        ? renderFence(tokens, index, renderOptions, env, renderer)
        : renderer.renderToken(tokens, index, renderOptions)
    }
    catch (error) {
      token.info = originalInfo
      throw error
    }

    const copyLabels = options.resolveCopyLabels?.(env as CodeBlockRenderEnv) ?? ENGLISH_COPY_LABELS
    const wrap = (html: string): string => renderCodeBlock(
      html,
      token.content,
      info,
      copyLabels,
      languageLabels,
    )
    if (typeof rendered === 'string') {
      token.info = originalInfo
      return wrap(rendered)
    }
    return rendered
      .then(wrap)
      .finally(() => {
        token.info = originalInfo
      })
  }
}

function renderCodeBlock(
  rendered: string,
  source: string,
  info: FenceInfo,
  labels: CodeBlockCopyLabels,
  languageLabels: Map<string, string>,
): string {
  const languageId = info.language || 'text'
  const languageLabel = languageLabels.get(languageId) ?? languageId
  const lineNumbers = info.lineNumbers
    ? renderLineNumbers(rendered, source, info.startLine)
    : undefined
  const modeClass = info.lineNumbers ? ' kawa-code-block--line-numbers' : ''
  const lineNumberStyle = lineNumbers
    ? ` style="--kawa-code-block-line-number-digits:${lineNumbers.digits}"`
    : ''

  return `<div class="kawa-code-block language-${escapeAttribute(languageId)}${modeClass}" data-language="${escapeAttribute(languageId)}"${lineNumberStyle}><span class="kawa-code-block__language">${escapeHtml(languageLabel)}</span><button class="kawa-code-block__copy" type="button" aria-label="${escapeAttribute(labels.copy)}" title="${escapeAttribute(labels.copy)}" data-copy-label="${escapeAttribute(labels.copy)}" data-copied-label="${escapeAttribute(labels.copied)}"><span class="kawa-code-block__copy-status" aria-live="polite"></span></button><div class="kawa-code-block__body">${rendered}${lineNumbers?.html ?? ''}</div></div>\n`
}

function parseFenceInfo(info: string, defaultLineNumbers: boolean): FenceInfo {
  let lineNumbers = defaultLineNumbers
  let startLine = 1

  const applyDirective = (directive: string): void => {
    const match = directive.match(LINE_NUMBER_DIRECTIVE_RE)
    if (!match) {
      return
    }
    lineNumbers = !match[1]
    if (lineNumbers && match[2]) {
      startLine = Number.parseInt(match[2], 10)
    }
  }

  let normalized = info
  const attached = normalized.match(ATTACHED_LINE_NUMBER_DIRECTIVES_RE)
  if (attached) {
    for (const match of attached[2].matchAll(LINE_NUMBER_DIRECTIVES_RE)) {
      applyDirective(match[0])
    }
    normalized = attached[1] + normalized.slice(attached[0].length)
  }
  normalized = normalized.replace(
    STANDALONE_LINE_NUMBER_DIRECTIVE_RE,
    (_full, _spacing: string, directive: string) => {
      applyDirective(directive)
      return ''
    },
  ).trim()

  return {
    language: normalized.match(/^[\w-]+/)?.[0]?.toLowerCase() ?? '',
    normalized,
    lineNumbers,
    startLine,
  }
}

function renderLineNumbers(
  rendered: string,
  source: string,
  startLine: number,
): RenderedLineNumbers {
  const code = source.replace(/\r?\n$/, '')
  const lineCount = getRenderedLineCount(rendered)
    ?? code.split(/\r?\n/).length
  const lastLine = startLine + lineCount - 1
  const lines = Array.from({ length: lineCount }, (_, index) => (
    `<span class="kawa-code-block__line-number">${startLine + index}</span>`
  )).join('')
  return {
    digits: Math.max(String(startLine).length, String(lastLine).length),
    html: `<div class="kawa-code-block__line-numbers" aria-hidden="true">${lines}</div>`,
  }
}

function getRenderedLineCount(rendered: string): number | undefined {
  const match = rendered.match(
    /\bdata-kawa-line-count=(?:"(\d+)"|'(\d+)')/,
  )
  if (!match) {
    return
  }
  const count = Number.parseInt(match[1] ?? match[2], 10)
  return count > 0 ? count : undefined
}

function resolveCopyLabels(
  path: string,
  locales: Record<string, LocaleConfig>,
  options: CodeBlockPluginOptions,
): CodeBlockCopyLabels {
  const localeIndex = resolveLocaleIndex(path, locales)
  const language = locales[localeIndex]?.lang
  const builtIn = language?.toLowerCase().startsWith('zh')
    ? CHINESE_COPY_LABELS
    : ENGLISH_COPY_LABELS

  return {
    ...builtIn,
    ...options.copyLabels,
    ...options.localeCopyLabels?.[localeIndex],
  }
}

function resolveLocaleIndex(
  path: string,
  locales: Record<string, LocaleConfig>,
): string {
  const pathname = path.replace(/([?#].*)$/, '')
  return Object.keys(locales)
    .filter(locale => locale !== 'root')
    .sort((left, right) => right.length - left.length)
    .find((locale) => {
      const prefix = `/${locale}`
      return pathname === prefix || pathname.startsWith(`${prefix}/`)
    }) ?? 'root'
}

function normalizeLanguageLabels(
  labels: Record<string, string> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels ?? {}).map(([language, label]) => (
      [language.toLowerCase(), label]
    )),
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value)
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}
