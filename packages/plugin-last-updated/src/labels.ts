import type { LastUpdatedLabels, LastUpdatedRuntimeOptions } from './types'

/** Text before the date, including the separator each language writes after it. */
export interface ResolvedLastUpdatedTexts {
  lastUpdated: string
  editLink: string
}

const ENGLISH_LABELS: LastUpdatedLabels = {
  lastUpdated: 'Last updated',
  editLink: 'Edit this page',
}

const CHINESE_LABELS: LastUpdatedLabels = {
  lastUpdated: '最后更新于',
  editLink: '编辑此页',
}

/** Chinese writes a full-width colon and needs no space after it. */
const ENGLISH_SEPARATOR = ': '
const CHINESE_SEPARATOR = '：'

export interface ResolveLastUpdatedLabelsOptions {
  /** `lang` of the current locale; anything starting with `zh` gets Chinese text. */
  lang?: string
  /** KawaPress locale key of the current page, for example `root` or `en`. */
  localeIndex?: string
  labels?: LastUpdatedRuntimeOptions['labels']
  localeLabels?: LastUpdatedRuntimeOptions['localeLabels']
}

/**
 * Picks the visible strings for one page: the locale key wins over the global
 * override, which wins over the built-in text of the language.
 */
export function resolveLastUpdatedTexts(
  options: ResolveLastUpdatedLabelsOptions = {},
): ResolvedLastUpdatedTexts {
  const localeIndex = options.localeIndex ?? 'root'
  const builtIn = isChinese(options.lang) ? CHINESE_LABELS : ENGLISH_LABELS
  const separator = isChinese(options.lang) ? CHINESE_SEPARATOR : ENGLISH_SEPARATOR

  const read = (key: keyof LastUpdatedLabels): string => (
    options.localeLabels?.[localeIndex]?.[key]
    ?? options.labels?.[key]
    ?? builtIn[key]
  )

  return {
    lastUpdated: `${read('lastUpdated')}${separator}`,
    editLink: read('editLink'),
  }
}

function isChinese(lang: string | undefined): boolean {
  return typeof lang === 'string' && lang.toLocaleLowerCase().startsWith('zh')
}
