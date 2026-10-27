import type { Router, RouterHistory } from 'vue-router'
import type { HydrationPlan } from '../core/hydration-plan'
import { resolveHydrationPlan } from '../core/hydration-plan'
import { NOT_FOUND_DOCUMENT_META } from '../core/not-found'

export interface ClientHydration {
  /** History the router has to use so its first render matches the served HTML. */
  history: RouterHistory
  /** Moves the router to the URL in the address bar; see {@link createClientHydration}. */
  adoptRequestedUrl: () => Promise<void>
}

const NOT_FOUND_DOCUMENT_SELECTOR = `meta[name="${NOT_FOUND_DOCUMENT_META}"]`

/**
 * Wrap the browser history so the router can start on the route the server
 * rendered without ever changing the address bar.
 *
 * The served HTML only describes a path: static hosts ignore the query and the
 * browser never sends the hash, and the not-found document is prerendered at
 * `/404` but served for every unknown URL. The first client render therefore has
 * to use that path as well; only after hydration may the router move to the URL
 * the visitor opened.
 *
 * The router reads `history.location` exactly once, when it installs and starts
 * its first navigation, so the plan is resolved lazily at that moment (by then
 * `getRouter()` returns the router and can tell which route the URL matches).
 * While the plan is deferred, every navigation the router runs writes nothing to
 * `window.history`: the router keeps its own route state, and the browser keeps
 * showing the requested URL. `adoptRequestedUrl` then replaces the location with
 * that same URL through the real history, so the address bar does not move, no
 * new history entry appears and no reload happens.
 */
export function createClientHydration(
  history: RouterHistory,
  getRouter: () => Router | undefined,
): ClientHydration {
  // The web history already resolved `window.location` against the site base,
  // so this is the URL the visitor opened, in router terms.
  const requestedLocation = history.location
  let plan: HydrationPlan | undefined
  let adopted = false

  function requireRouter(): Router {
    const router = getRouter()
    if (!router) {
      throw new Error(
        'KawaPress: the client hydration needs the router. Read the history location only after createRouter().',
      )
    }
    return router
  }

  function hydrationPlan(): HydrationPlan {
    plan ??= resolveHydrationPlan({
      isNotFoundDocument: document.querySelector(NOT_FOUND_DOCUMENT_SELECTOR) !== null,
      requestedLocation,
      routeName: requireRouter().resolve(requestedLocation).name,
    })
    return plan
  }

  function isDeferred(): boolean {
    return !adopted && hydrationPlan().adoptPath !== undefined
  }

  const deferredHistory: RouterHistory = {
    get base() {
      return history.base
    },
    get location() {
      return isDeferred() ? hydrationPlan().hydratePath : history.location
    },
    get state() {
      return history.state
    },
    createHref: location => history.createHref(location),
    push(to, data) {
      if (!isDeferred()) {
        history.push(to, data)
      }
    },
    replace(to, data) {
      if (!isDeferred()) {
        history.replace(to, data)
      }
    },
    go: (delta, triggerListeners) => history.go(delta, triggerListeners),
    listen: callback => history.listen(callback),
    destroy: () => history.destroy(),
  }

  return {
    history: deferredHistory,
    async adoptRequestedUrl() {
      const { adoptPath } = hydrationPlan()
      // The history writes for real again from here on, so this replace stores
      // the URL the address bar already shows; `replace` never adds an entry.
      adopted = true
      if (adoptPath === undefined) {
        return
      }
      await requireRouter().replace(adoptPath)
    },
  }
}
