import { assertJsonSerializable } from './json'

export type LocaleDirection = 'ltr' | 'rtl'

export interface LocaleConfig<ThemeConfig extends object = object> {
  label: string
  lang?: string
  dir?: LocaleDirection
  link?: string
  title?: string
  themeConfig?: ThemeConfig
}

export interface SiteConfig<ThemeConfig extends object = object> {
  title?: string
  base?: string
  srcDir?: string
  publicDir?: string
  themeConfig?: ThemeConfig
  locales?: Record<string, LocaleConfig<ThemeConfig>>
}

/** Raw site data exposed to the client via virtual module. */
export interface SiteData<ThemeConfig extends object = object> {
  title: string
  base: string
  themeConfig?: ThemeConfig
  locales: Record<string, LocaleConfig<ThemeConfig>>
}

/** Site data resolved for the current route and locale. */
export interface ResolvedSiteData<ThemeConfig extends object = object> {
  title: string
  base: string
  themeConfig: ThemeConfig
  localeIndex: string
  label?: string
  lang?: string
  dir?: LocaleDirection
  link: string
}

export interface LocaleLink {
  localeIndex: string
  label: string
  link: string
  lang?: string
  dir?: LocaleDirection
}

export interface PageHeader {
  level: number
  title: string
  slug: string
  link: string
  children: PageHeader[]
}

export interface PageData {
  path: string
  title: string
  frontmatter: Record<string, unknown>
  headers: PageHeader[]
}

export function assertPageDataSerializable(pageData: PageData): void {
  const route = typeof pageData.path === 'string'
    ? JSON.stringify(pageData.path)
    : '<unknown route>'
  assertJsonSerializable(pageData, {
    label: `pageData for route ${route}`,
    path: 'pageData',
  })
}
