import type { PageTable } from '../../core/page-manifest'
import type { AppRouterInstance } from './router'
import { site } from 'virtual:kawapress-site'
import { resolveHydrationPlan } from '../../core/hydration-plan'
import { NOT_FOUND_DOCUMENT_META } from '../../core/not-found'
import { createBrowserHistory, createMemoryHistory } from './history'
import { installLinkInterceptor } from './link-interceptor'
import { createRouter } from './router'

export interface AppRouter {
  router: AppRouterInstance
  /**
   * Loads the page of the route the served HTML was rendered with, so the first
   * render matches the markup exactly. Resolves before the app mounts.
   */
  start: () => Promise<void>
  /**
   * Points the router at the URL in the address bar once the app is hydrated,
   * without a navigation and without a history entry. A no-op on the server.
   */
  adoptRequestedUrl: () => Promise<void>
}

export function createAppRouter(pages: PageTable): AppRouter {
  if (import.meta.env.SSR) {
    // Every render gets its own router: one table lookup and one page load, no
    // matching structure and no state shared between requests.
    const router = createRouter({ pages, history: createMemoryHistory() })
    return {
      router,
      start: () => Promise.resolve(),
      adoptRequestedUrl: () => Promise.resolve(),
    }
  }

  const history = createBrowserHistory(site.base)
  const router = createRouter({ pages, history })
  // The served HTML only describes a path: static hosts ignore the query, the
  // browser never sends the hash and the not-found document is served for every
  // unknown URL. See resolveHydrationPlan().
  const plan = resolveHydrationPlan({
    isNotFoundDocument: document
      .querySelector(`meta[name="${NOT_FOUND_DOCUMENT_META}"]`) !== null,
    requestedLocation: history.location(),
    hasPage: path => Object.hasOwn(pages, path),
  })
  installLinkInterceptor(router, pages, site.base)

  return {
    router,
    start: () => router.enter(plan.startPath),
    async adoptRequestedUrl() {
      // An encoded page path is replaced by the decoded one it resolved to.
      if (plan.replacePath !== undefined) {
        history.replace(plan.replacePath)
      }
      if (plan.adoptPath !== undefined) {
        await router.enter(plan.adoptPath)
      }
    },
  }
}
