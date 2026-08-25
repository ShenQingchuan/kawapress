import type { MarkdownItAlertOptions } from '@mdit/plugin-alert'
import type {
  KawaPressPlugin,
  LocaleConfig,
} from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { alert } from '@mdit/plugin-alert'
import { definePlugin, useMarkdownItPlugin } from 'kawapress'

export const GITHUB_ALERT_TYPES = [
  'note',
  'tip',
  'important',
  'warning',
  'caution',
] as const

export type GitHubAlertType = typeof GITHUB_ALERT_TYPES[number]

export type GitHubAlertLabels = Record<GitHubAlertType, string>

export interface GitHubAlertsPluginOptions {
  /** Override default titles for every locale. */
  labels?: Partial<GitHubAlertLabels>
  /** Override default titles for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<GitHubAlertLabels>>
}

interface AlertRenderEnv {
  path?: string
}

interface InstallGitHubAlertsOptions {
  resolveTitle?: (type: GitHubAlertType, env: AlertRenderEnv) => string
}

const ENGLISH_LABELS: GitHubAlertLabels = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

const CHINESE_LABELS: GitHubAlertLabels = {
  note: '注意',
  tip: '提示',
  important: '重要',
  warning: '警告',
  caution: '小心',
}

const DEFAULT_LOCALES: Record<string, LocaleConfig> = {
  root: {
    label: 'English',
    lang: 'en',
  },
}

export function githubAlertsPlugin(
  options: GitHubAlertsPluginOptions = {},
): KawaPressPlugin {
  let locales = DEFAULT_LOCALES

  return definePlugin({
    name: '@kawapress/plugin-github-alerts',
    setup(api) {
      api.config((config) => {
        locales = config.locales ?? DEFAULT_LOCALES
      })
      api.markdown((markdown) => {
        installGitHubAlerts(markdown, {
          resolveTitle: (type, env) => resolveDefaultTitle(
            type,
            env.path ?? '/',
            locales,
            options,
          ),
        })
      })
    },
  })
}

export default githubAlertsPlugin

export function installGitHubAlerts(
  markdown: MarkdownExit,
  options: InstallGitHubAlertsOptions = {},
): void {
  const alertOptions: MarkdownItAlertOptions = {
    alertNames: [...GITHUB_ALERT_TYPES],
    deep: false,
    openRender(tokens, index) {
      const type = readAlertType(tokens[index].markup)
      return `<div class="kawa-alert kawa-alert--${type}">\n`
    },
    closeRender: () => '</div>\n',
    titleRender(tokens, index, _renderOptions, env) {
      const type = readAlertType(tokens[index].markup)
      const title = options.resolveTitle?.(type, env as AlertRenderEnv)
        ?? ENGLISH_LABELS[type]
      const renderedTitle = markdown.renderInline(
        title,
        createInlineRenderEnv(env),
      )
      return `<p class="kawa-alert__title">${renderedTitle}</p>\n`
    },
  }

  useMarkdownItPlugin(markdown, alert, alertOptions)
}

function resolveDefaultTitle(
  type: GitHubAlertType,
  path: string,
  locales: Record<string, LocaleConfig>,
  options: GitHubAlertsPluginOptions,
): string {
  const localeIndex = resolveLocaleIndex(path, locales)
  const language = locales[localeIndex]?.lang
  const builtInLabels = language?.toLowerCase().startsWith('zh')
    ? CHINESE_LABELS
    : ENGLISH_LABELS

  return options.localeLabels?.[localeIndex]?.[type]
    ?? options.labels?.[type]
    ?? builtInLabels[type]
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

function createInlineRenderEnv(env: unknown): Record<string, unknown> {
  return env && typeof env === 'object'
    ? { ...env }
    : {}
}

function readAlertType(markup: string): GitHubAlertType {
  const type = markup.toLowerCase()
  if (GITHUB_ALERT_TYPES.includes(type as GitHubAlertType)) {
    return type as GitHubAlertType
  }
  throw new Error(`KawaPress GitHub alert received unsupported type ${JSON.stringify(markup)}.`)
}
