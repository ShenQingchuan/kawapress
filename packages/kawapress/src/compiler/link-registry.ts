import type { PageLinks } from '../core/dead-links'

/**
 * Per-page link records collected while Markdown pages are compiled. The page
 * loader owns one registry per site, so a build or a dev session shares the same
 * view of the site.
 */
export interface LinkRegistry {
  /** Store a page, replacing any earlier record of the same route. */
  set: (page: PageLinks) => void
  get: (route: string) => PageLinks | undefined
  /** Every recorded page, in the order the site loaded them. */
  pages: () => PageLinks[]
}

export function createLinkRegistry(): LinkRegistry {
  const pages = new Map<string, PageLinks>()
  return {
    set(page) {
      pages.set(page.route, page)
    },
    get(route) {
      return pages.get(route)
    },
    pages() {
      return [...pages.values()]
    },
  }
}
