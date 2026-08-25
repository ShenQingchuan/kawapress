import type { MarkdownItContainerOptions } from '@mdit/plugin-container'
import type {
  KawaPressPlugin,
  LocaleConfig,
} from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { container } from '@mdit/plugin-container'
import { definePlugin } from 'kawapress'

export const CONTAINER_TYPES = [
  'info',
  'tip',
  'warning',
  'danger',
  'details',
] as const

export type ContainerType = typeof CONTAINER_TYPES[number]

export type ContainerLabels = Record<ContainerType, string>

export interface ContainerPluginOptions {
  /** Override default titles for every locale. */
  labels?: Partial<ContainerLabels>
  /** Override default titles for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<ContainerLabels>>
}

interface ContainerRenderEnv {
  path?: string
}

interface InstallContainerOptions {
  resolveTitle?: (type: ContainerType, env: ContainerRenderEnv) => string
}

const ENGLISH_LABELS: ContainerLabels = {
  info: 'Info',
  tip: 'Tip',
  warning: 'Warning',
  danger: 'Danger',
  details: 'Details',
}

const CHINESE_LABELS: ContainerLabels = {
  info: '信息',
  tip: '提示',
  warning: '警告',
  danger: '危险',
  details: '详细信息',
}

const DEFAULT_LOCALES: Record<string, LocaleConfig> = {
  root: {
    label: 'English',
    lang: 'en',
  },
}

export function containerPlugin(
  options: ContainerPluginOptions = {},
): KawaPressPlugin {
  let locales = DEFAULT_LOCALES

  return definePlugin({
    name: '@kawapress/plugin-container',
    setup(api) {
      api.config((config) => {
        locales = config.locales ?? DEFAULT_LOCALES
      })
      api.markdown((markdown) => {
        installContainers(markdown, {
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

export default containerPlugin

export function installContainers(
  markdown: MarkdownExit,
  options: InstallContainerOptions = {},
): void {
  for (const type of CONTAINER_TYPES) {
    const containerOptions: MarkdownItContainerOptions = {
      name: type,
      validate: params => readContainerType(params) === type,
      openRender(tokens, index, _renderOptions, env) {
        const customTitle = tokens[index].info.trim().slice(type.length).trim()
        const title = customTitle || options.resolveTitle?.(
          type,
          env as ContainerRenderEnv,
        ) || ENGLISH_LABELS[type]
        const renderedTitle = markdown.renderInline(title, env)

        if (type === 'details') {
          return `<details class="kawa-container kawa-container--details"><summary class="kawa-container__title">${renderedTitle}</summary>\n`
        }

        return `<div class="kawa-container kawa-container--${type}"><p class="kawa-container__title">${renderedTitle}</p>\n`
      },
      closeRender: () => type === 'details' ? '</details>\n' : '</div>\n',
    }

    markdown.use(container as any, containerOptions)
  }
}

function resolveDefaultTitle(
  type: ContainerType,
  path: string,
  locales: Record<string, LocaleConfig>,
  options: ContainerPluginOptions,
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

function readContainerType(params: string): string {
  return params.trim().split(/\s+/, 1)[0] ?? ''
}
