import type { CommentsLabels, ResolvedCommentsOptions } from './options'

const ENGLISH_LABELS: CommentsLabels = {
  heading: 'Comments',
}

const CHINESE_LABELS: CommentsLabels = {
  heading: '评论',
}

export type CommentsLabelOptions = Pick<
  ResolvedCommentsOptions,
  'labels' | 'localeLabels'
>

/**
 * Built-in labels in the language of the current locale, then the site-wide
 * override, then the override for this locale key.
 */
export function resolveCommentsLabels(
  options: CommentsLabelOptions,
  localeIndex: string,
  lang: string | undefined,
): CommentsLabels {
  const builtIn = isChinese(lang) ? CHINESE_LABELS : ENGLISH_LABELS
  return {
    ...builtIn,
    ...options.labels,
    ...options.localeLabels[localeIndex],
  }
}

export function isChinese(lang: string | undefined): boolean {
  return (lang ?? '').toLowerCase().startsWith('zh')
}
