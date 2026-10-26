import type { Component } from 'vue'
import type { PageModule } from '../core/page-manifest'
import type { PageData } from '../core/site'

// path-level cache: same content for every request, safe under SSR concurrency
const cache = new Map<string, PageData>()

export function wrapPageLoader(path: string, loader: () => Promise<PageModule>) {
  return async (): Promise<Component> => {
    const mod = await loader()
    if (mod.__pageData) {
      cache.set(path, {
        ...mod.__pageData,
        path,
      })
    }
    return mod.default
  }
}

export function getPageData(path: string): PageData | undefined {
  return cache.get(path)
}
