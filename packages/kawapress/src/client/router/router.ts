import type { Component, ShallowRef } from 'vue'
import type { PageTable } from '../../core/page-manifest'
import type { Route, RouteGuard, RouteHook, Router } from '../../core/router'
import type { RouteHistory } from './history'
import { shallowRef } from 'vue'
import { loadPage } from '../page-data'
import { resolveRoute } from './route'

/** How a committed navigation reaches the browser history. */
type HistoryWrite = 'push' | 'replace' | 'none'

/**
 * The router object a KawaPress app provides. `page` is internal: `RouterView`
 * renders it, and it is the only piece of state that is not part of the route.
 */
export interface AppRouterInstance extends Router {
  /** Component of the current route; `null` for the not-found page. */
  readonly page: Readonly<ShallowRef<Component | null>>
  /**
   * Resolves `location`, loads its page and commits it without writing a
   * history entry. Used for the route the served HTML was rendered with and for
   * the URL adopted after hydration.
   */
  enter: (location: string) => Promise<void>
}

export interface CreateRouterOptions {
  pages: PageTable
  history: RouteHistory
}

/**
 * Create the router of one app.
 *
 * A documentation site only looks a path up in the page table, so a navigation
 * is: run the guards, load the page module, commit the route, write the history,
 * run the post hooks. Back and forward arrive through the history listener and
 * never write a history entry themselves.
 */
export function createRouter({ pages, history }: CreateRouterOptions): AppRouterInstance {
  const currentRoute = shallowRef<Route>(resolveRoute(history.location(), pages))
  const page = shallowRef<Component | null>(null)
  const guards: RouteGuard[] = []
  const hooks: RouteHook[] = []
  /** Counter that makes the latest navigation win over slower earlier ones. */
  let revision = 0

  async function navigate(location: string, write: HistoryWrite): Promise<void> {
    const from = currentRoute.value
    const to = resolveRoute(location, pages)
    const started = ++revision

    if (!await runGuards(to, from, started)) {
      return
    }
    // A guard may be asynchronous; a newer navigation may have started since.
    if (started !== revision) {
      return
    }

    let component = page.value
    // Same path means a query- or hash-only change: do not load the page again.
    if (to.path !== from.path || component === null) {
      component = await loadPage(to.path, pages)
      if (started !== revision) {
        return
      }
    }

    if (write !== 'none') {
      history[write](to.fullPath)
    }
    currentRoute.value = to
    page.value = component

    for (const hook of [...hooks]) {
      hook(to, from)
    }
  }

  async function runGuards(to: Route, from: Route, started: number): Promise<boolean> {
    for (const guard of [...guards]) {
      const result = await guard(to, from)
      if (started !== revision || result === false) {
        return false
      }
    }
    return true
  }

  history.listen((location) => {
    void navigate(location, 'none').catch(reportNavigationError)
  })

  return {
    currentRoute,
    page,
    enter: location => navigate(location, 'none'),
    push: location => navigate(location, 'push'),
    replace: location => navigate(location, 'replace'),
    beforeEach(guard) {
      guards.push(guard)
      return () => remove(guards, guard)
    },
    afterEach(hook) {
      hooks.push(hook)
      return () => remove(hooks, hook)
    },
  }
}

function remove<T>(list: T[], item: T): void {
  const index = list.indexOf(item)
  if (index !== -1) {
    list.splice(index, 1)
  }
}

/** A navigation nobody awaits (a history event, a click) must not fail silently. */
function reportNavigationError(error: unknown): void {
  console.error('[KawaPress] Navigation failed:', error)
}
