import type { LocaleConfig, PageBuildArtifact } from 'kawapress'
import type { SitemapPluginItem } from './types'

export interface CreateSitemapItemsOptions {
  pages: readonly PageBuildArtifact[]
  locales?: Record<string, LocaleConfig>
  lastUpdated: boolean
  /** 文件绝对路径到最后提交时间（毫秒）的映射，仅 `lastUpdated` 开启时使用 */
  gitLastUpdated?: ReadonlyMap<string, number>
}

interface PageVariant {
  lang: string
  url: string
  lastmod?: number
}

const DEFAULT_LANG = 'en'

export function createSitemapItems(options: CreateSitemapItemsOptions): SitemapPluginItem[] {
  const locales = options.locales ?? {}
  const rootLang = locales.root?.lang ?? DEFAULT_LANG
  const localeKeys = Object.keys(locales)
    .filter(key => key !== 'root')
    .sort((left, right) => right.length - left.length)

  const groups = new Map<string, PageVariant[]>()
  for (const page of options.pages) {
    if (page.pageData.frontmatter.sitemap === false) {
      continue
    }

    const localeIndex = localeKeys.find(key => (
      page.routePath === `/${key}` || page.routePath.startsWith(`/${key}/`)
    )) ?? 'root'
    const groupKey = localeIndex === 'root'
      ? page.routePath
      : page.routePath.slice(`/${localeIndex}`.length) || '/'

    const variant: PageVariant = {
      lang: localeIndex === 'root'
        ? rootLang
        : (locales[localeIndex]?.lang ?? localeIndex),
      url: toSitemapUrl(page.routePath),
      lastmod: resolveLastmod(page, options),
    }
    const variants = groups.get(groupKey) ?? []
    variants.push(variant)
    groups.set(groupKey, variants)
  }

  return [...groups.values()].flatMap(variants => (
    variants.length < 2
      ? [{ url: variants[0].url, lastmod: variants[0].lastmod }]
      : variants.map(({ url, lastmod }) => ({
          url,
          lastmod,
          links: variants.map(link => ({ lang: link.lang, url: link.url })),
        }))
  ))
}

function resolveLastmod(
  page: PageBuildArtifact,
  options: CreateSitemapItemsOptions,
): number | undefined {
  if (!options.lastUpdated) {
    return undefined
  }
  const frontmatterValue = page.pageData.frontmatter.lastUpdated
  if (frontmatterValue === false) {
    return undefined
  }
  if (typeof frontmatterValue === 'string') {
    const time = Date.parse(frontmatterValue)
    if (Number.isNaN(time)) {
      throw new TypeError(`KawaPress Sitemap: ${page.routePath} 的 frontmatter lastUpdated 不是有效日期：${JSON.stringify(frontmatterValue)}`)
    }
    return time
  }
  return options.gitLastUpdated?.get(page.file)
}

/**
 * sitemap 库会用 `new URL(url, hostname)` 解析条目。
 * 这里输出不带前导斜杠的相对路径，使 hostname 中的 base 得以保留。
 */
function toSitemapUrl(routePath: string): string {
  const path = routePath.replace(/^\/+/, '')
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}
