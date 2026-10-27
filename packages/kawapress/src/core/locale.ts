import type { LocaleLink, ResolvedSiteData, SiteData } from './site'
import { withBase } from './base'

const EXTERNAL_URL_RE = /^(?:[a-z][a-z\d+.-]*:)?\/\//i
const PATH_SUFFIX_RE = /([?#].*)$/

/**
 * Locale key that a route path belongs to. `root` owns every path outside the
 * other locale prefixes; the longest matching prefix wins.
 */
export function resolveLocaleIndex(path: string, localeKeys: Iterable<string>): string {
  const pathname = path.replace(PATH_SUFFIX_RE, '')
  const candidates = [...localeKeys]
    .filter(localeKey => localeKey !== 'root')
    .sort((left, right) => right.length - left.length)

  return candidates.find((localeKey) => {
    const prefix = `/${localeKey}`
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  }) ?? 'root'
}

export function getLocaleIndex(
  site: SiteData,
  path: string,
): string {
  return resolveLocaleIndex(path, Object.keys(site.locales))
}

export function getLocaleHome(
  site: SiteData,
  localeIndex: string,
): string {
  return site.locales[localeIndex]?.link
    ?? (localeIndex === 'root' ? '/' : `/${localeIndex}`)
}

export function resolveSiteDataByPath(
  site: SiteData,
  path: string,
): ResolvedSiteData {
  const localeIndex = getLocaleIndex(site, path)
  const locale = site.locales[localeIndex]
  const themeConfig = {
    ...(site.themeConfig ?? {}),
    ...(locale?.themeConfig ?? {}),
  }

  return {
    title: locale?.title ?? site.title,
    base: site.base,
    themeConfig,
    localeIndex,
    label: locale?.label,
    lang: locale?.lang,
    dir: locale?.dir,
    link: withBase(getLocaleHome(site, localeIndex), site.base),
    head: site.head,
    localeHead: locale?.head ?? [],
  }
}

export function resolveLocaleLink(
  site: SiteData,
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

export function resolveLocaleLinks(
  site: SiteData,
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
