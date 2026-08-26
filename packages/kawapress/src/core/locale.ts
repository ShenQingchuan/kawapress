import type { LocaleLink, ResolvedSiteData, SiteData } from './site'
import { withBase } from './base'

const EXTERNAL_URL_RE = /^(?:[a-z][a-z\d+.-]*:)?\/\//i
const PATH_SUFFIX_RE = /([?#].*)$/

export function getLocaleIndex<ThemeConfig extends object>(
  site: SiteData<ThemeConfig>,
  path: string,
): string {
  const pathname = path.replace(PATH_SUFFIX_RE, '')
  const localeKeys = Object.keys(site.locales)
    .filter(locale => locale !== 'root')
    .sort((left, right) => right.length - left.length)

  return localeKeys.find((locale) => {
    const prefix = `/${locale}`
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  }) ?? 'root'
}

export function getLocaleHome<ThemeConfig extends object>(
  site: SiteData<ThemeConfig>,
  localeIndex: string,
): string {
  return site.locales[localeIndex]?.link
    ?? (localeIndex === 'root' ? '/' : `/${localeIndex}`)
}

export function resolveSiteDataByPath<ThemeConfig extends object>(
  site: SiteData<ThemeConfig>,
  path: string,
): ResolvedSiteData<ThemeConfig> {
  const localeIndex = getLocaleIndex(site, path)
  const locale = site.locales[localeIndex]
  const themeConfig = {
    ...(site.themeConfig ?? {}),
    ...(locale?.themeConfig ?? {}),
  } as ThemeConfig

  return {
    title: locale?.title ?? site.title,
    base: site.base,
    themeConfig,
    localeIndex,
    label: locale?.label,
    lang: locale?.lang,
    dir: locale?.dir,
    link: withBase(getLocaleHome(site, localeIndex), site.base),
  }
}

export function resolveLocaleLink<ThemeConfig extends object>(
  site: SiteData<ThemeConfig>,
  currentPath: string,
  targetLocale: string,
): string {
  const targetHome = getLocaleHome(site, targetLocale)
  if (EXTERNAL_URL_RE.test(targetHome)) {
    return targetHome
  }

  const suffix = currentPath.match(PATH_SUFFIX_RE)?.[1] ?? ''
  const pathname = currentPath.replace(PATH_SUFFIX_RE, '')
  const currentLocale = getLocaleIndex(site, pathname)
  const relativePath = removeLocalePrefix(pathname, currentLocale)
  const targetPath = joinLocalePath(targetHome, relativePath)
  return `${withBase(targetPath, site.base)}${suffix}`
}

export function resolveLocaleLinks<ThemeConfig extends object>(
  site: SiteData<ThemeConfig>,
  currentPath: string,
): LocaleLink[] {
  return Object.entries(site.locales).map(([localeIndex, locale]) => ({
    localeIndex,
    label: locale.label,
    link: resolveLocaleLink(site, currentPath, localeIndex),
    lang: locale.lang,
    dir: locale.dir,
  }))
}

function removeLocalePrefix(path: string, localeIndex: string): string {
  if (localeIndex === 'root') {
    return path.replace(/^\/+/, '')
  }

  const prefix = `/${localeIndex}`
  return path.slice(prefix.length).replace(/^\/+/, '')
}

function joinLocalePath(localeHome: string, relativePath: string): string {
  if (!relativePath) {
    return ensureLeadingSlash(localeHome)
  }

  const base = ensureLeadingSlash(localeHome).replace(/\/+$/, '')
  return `${base}/${relativePath}`
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}
