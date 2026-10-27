import type { Component } from 'vue'
import type { PageData } from '../core/extension-points'
import type { PageTable } from '../core/page-manifest'

// path-level cache: same content for every request, safe under SSR concurrency
const cache = new Map<string, PageData>()

/**
 * Load the page component of `path` and remember the page data it carries.
 * Returns `null` for a path the page table does not know, which is what the
 * router renders as the not-found page.
 */
export async function loadPage(
  path: string,
  pages: PageTable,
): Promise<Component | null> {
  const load = pages[path]
  if (!load) {
    return null
  }

  const module = await load()
  if (module.__pageData) {
    cache.set(path, {
      ...module.__pageData,
      path,
    })
  }
  return module.default
}

export function getPageData(path: string): PageData | undefined {
  return cache.get(path)
}
