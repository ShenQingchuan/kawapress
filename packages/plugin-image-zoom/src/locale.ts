import type { LocaleConfig } from 'kawapress'

/**
 * Language of every locale key, e.g. `{ root: 'zh-CN', en: 'en' }`. The
 * generator side needs it to pick built-in labels; the runtime receives the
 * same map as JSON so both sides always resolve a route to the same language.
 */
export type ImageZoomLocaleLanguages = Record<string, string | undefined>

export function resolveLocaleLanguages(
  locales: Record<string, LocaleConfig> | undefined,
): ImageZoomLocaleLanguages {
  return Object.fromEntries(
    Object.entries(locales ?? {}).map(([localeIndex, locale]) => (
      [localeIndex, locale.lang]
    )),
  )
}

/**
 * Locale key a route belongs to. `root` serves everything outside the other
 * locale prefixes, the same rule KawaPress uses for the site itself.
 */
export function resolveLocaleIndex(
  path: string,
  localeIndexes: Iterable<string>,
): string {
  const pathname = path.replace(/([?#].*)$/, '')
  return [...localeIndexes]
    .filter(localeIndex => localeIndex !== 'root')
    .sort((left, right) => right.length - left.length)
    .find((localeIndex) => {
      const prefix = `/${localeIndex}`
      return pathname === prefix || pathname.startsWith(`${prefix}/`)
    }) ?? 'root'
}
