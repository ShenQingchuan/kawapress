/**
 * Languages a generated site can use.
 *
 * `root` content is always the default language and lives at the site root, so
 * the default language only needs a label and a `lang` attribute. A second
 * language owns a URL prefix, which is why it also needs a locale key.
 */
export const siteLanguages = ['en', 'zh-CN'] as const

export type SiteLanguage = (typeof siteLanguages)[number]

/** `none` means the generated site stays single-language. */
export type SecondLanguage = SiteLanguage | 'none'

const localeKeys: Record<SiteLanguage, string> = {
  'en': 'en',
  'zh-CN': 'zh',
}

const languageLabels: Record<SiteLanguage, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
}

/** Directory name and URL prefix of a second language, e.g. `zh`. */
export function localeKey(language: SiteLanguage): string {
  return localeKeys[language]
}

/** Human-readable name shown in the language menu of a generated site. */
export function languageLabel(language: SiteLanguage): string {
  return languageLabels[language]
}

export function isSiteLanguage(value: string): value is SiteLanguage {
  return (siteLanguages as readonly string[]).includes(value)
}
