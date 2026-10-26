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
