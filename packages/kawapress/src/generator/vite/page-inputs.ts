import type { MarkdownPageLoader } from '../../compiler/page-loader'
import { pageInputName } from '../../core/page-chunk'
import { listMarkdownPages } from '../pages'
import { pageScope } from './plugins/pages'

/**
 * One client build input per Markdown page, keyed by the entry name and holding
 * the absolute module path.
 *
 * Pages are inputs of their own instead of being reached through a dynamic
 * import, so each page becomes a chunk with a content hash without Vite writing
 * a preload dependency table for every loader.
 */
export async function createPageInputs(
  pageLoader: MarkdownPageLoader,
  publicDir: string,
): Promise<Record<string, string>> {
  const pages = await listMarkdownPages(pageScope(pageLoader, publicDir))
  return Object.fromEntries(
    pages.map(page => [pageInputName(page.routePath), page.file]),
  )
}
