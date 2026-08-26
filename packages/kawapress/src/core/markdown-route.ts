const MARKDOWN_PAGE_EXTENSION_RE = /\.(?:md|html)$/i

/** Convert a source-relative Markdown page path to its public route path. */
export function markdownPagePathToRoutePath(pagePath: string): string {
  const normalizedPath = `/${pagePath
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')}`
  const withoutExtension = normalizedPath.replace(
    MARKDOWN_PAGE_EXTENSION_RE,
    '',
  )

  if (withoutExtension === '/index') {
    return '/'
  }
  return withoutExtension.endsWith('/index')
    ? withoutExtension.slice(0, -'/index'.length)
    : withoutExtension
}
