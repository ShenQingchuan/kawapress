const TRAILING_SLASH_RE = /\/+$/

export function normalizeSitemapBase(base: string | undefined): string {
  if (!base || base === '/') {
    return '/'
  }
  return `/${base.replace(/^\/+|\/+$/g, '')}/`
}

/**
 * 把 `hostname` 与站点 `base` 合并为 sitemap 的基地址。
 * 如果 `hostname` 已经包含 `base`，则不会重复追加。
 */
export function resolveSitemapHostname(hostname: string, base: string): string {
  const url = new URL(hostname)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`KawaPress Sitemap: hostname must use http or https, received ${JSON.stringify(hostname)}.`)
  }

  const sitePath = normalizeSitemapBase(base)
  const hostPath = `${url.pathname.replace(TRAILING_SLASH_RE, '')}/`
  url.pathname = hostPath === sitePath || sitePath === '/'
    ? hostPath
    : `${hostPath.replace(TRAILING_SLASH_RE, '')}${sitePath}`
  url.search = ''
  url.hash = ''
  return url.href
}
