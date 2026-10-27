import type { PageData, ThemeConfig } from './extension-points'
import type { HeadConfig } from './head'
import { assertJsonSerializable } from './json'

export type LocaleDirection = 'ltr' | 'rtl'

export interface LocaleConfig {
  label: string
  lang?: string
  dir?: LocaleDirection
  link?: string
  title?: string
  head?: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
}

export interface SiteConfig {
  title?: string
  base?: string
  srcDir?: string
  publicDir?: string
  head?: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
  locales?: Record<string, LocaleConfig>
}

/** Raw site data exposed to the client via virtual module. */
export interface SiteData {
  title: string
  base: string
  head: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
  locales: Record<string, LocaleConfig>
}

/** Site data resolved for the current route and locale. */
export interface ResolvedSiteData {
  title: string
  base: string
  themeConfig: Partial<ThemeConfig>
  localeIndex: string
  label?: string
  lang?: string
  dir?: LocaleDirection
  link: string
  /** `<head>` tags from the site config, shared by every page. */
  head: HeadConfig[]
  /** `<head>` tags of the current locale, rendered after the site tags. */
  localeHead: HeadConfig[]
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

export function assertPageDataSerializable(pageData: PageData): void {
  const route = typeof pageData.path === 'string'
    ? JSON.stringify(pageData.path)
    : '<unknown route>'
  assertJsonSerializable(pageData, {
    label: `pageData for route ${route}`,
    path: 'pageData',
  })
}
