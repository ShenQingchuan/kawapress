import type { PageTable } from '../../core/page-manifest'
import type { Router } from '../../core/router'
import { decodeUrlPathname, withoutBase } from '../../core/base'

/**
 * Sends clicks on internal links through the router instead of the browser.
 *
 * The rules are the ones a reader expects from a documentation site: modified
 * clicks, other buttons, new windows, downloads, external URLs and anything
 * outside the site base keep their default behaviour, and so does a link to a
 * path the page table does not know, because only the server can answer that
 * with the not-found document.
 */
export function installLinkInterceptor(
  router: Router,
  pages: PageTable,
  base: string,
): void {
  if (import.meta.env.SSR) {
    return
  }

  window.addEventListener('click', (event) => {
    if (!isInterceptable(event)) {
      return
    }

    const anchor = (event.target as Element | null)?.closest('a')
    if (!anchor || anchor.target || anchor.hasAttribute('download')) {
      return
    }

    const href = anchor.getAttribute('href')
    // A bare fragment is handled by the browser: it moves the scroll container
    // of the current page without touching the router.
    if (!href || href.startsWith('#')) {
      return
    }

    // Anything that does not resolve to this origin keeps its default
    // behaviour: another site, but also `mailto:`, `tel:` or `javascript:`,
    // whose URLs have no origin.
    const url = new URL(anchor.href)
    if (url.origin !== window.location.origin) {
      return
    }

    const routePath = withoutBase(decodeUrlPathname(url.pathname), base)
    if (routePath === undefined || !Object.hasOwn(pages, routePath)) {
      return
    }

    event.preventDefault()
    void router.push(`${routePath}${url.search}${url.hash}`).catch((error: unknown) => {
      console.error('[KawaPress] Navigation failed:', error)
    })
  })
}

function isInterceptable(event: MouseEvent): boolean {
  return !event.defaultPrevented
    && event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
}
