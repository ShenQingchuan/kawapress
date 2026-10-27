import { NOT_FOUND_ROUTE_NAME, NOT_FOUND_ROUTE_PATH } from './not-found'

/**
 * Static hosts ignore the query and no browser ever sends the hash, so the HTML
 * a visitor receives can only describe the path: `/guide/routing?from=search#links`
 * is answered with the document of `/guide/routing`. The client therefore has to
 * render that same path first and move to the full URL only afterwards;
 * otherwise everything that reads the current route (language links, for
 * example) renders other values than the served markup and Vue reports a
 * hydration mismatch.
 */

export interface HydrationPlanInput {
  /** Whether the served HTML carries the not-found document marker. */
  isNotFoundDocument: boolean
  /**
   * Location the visitor opened, in router terms: the site base is already
   * removed, the query and the hash are still part of it.
   */
  requestedLocation: string
  /** Route `requestedLocation` resolves to, `null`/`undefined` when nothing matched. */
  routeName: string | symbol | null | undefined
}

export interface HydrationPlan {
  /** Route the client renders first, so its first render matches the HTML. */
  hydratePath: string
  /** Location to move to once the app is hydrated, `undefined` to stay put. */
  adoptPath?: string
}

/**
 * Pick the route for the first client render.
 *
 * The prerendered not-found document was rendered once, at `/404`, and is served
 * for every unknown URL, so its first render has to resolve `/404` too. Every
 * other document was rendered for its path alone, so the query and the hash are
 * dropped for the first render and adopted right afterwards, which is a normal
 * update instead of a mismatch.
 */
export function resolveHydrationPlan(
  { isNotFoundDocument, requestedLocation, routeName }: HydrationPlanInput,
): HydrationPlan {
  if (isNotFoundDocument && routeName === NOT_FOUND_ROUTE_NAME) {
    return { hydratePath: NOT_FOUND_ROUTE_PATH, adoptPath: requestedLocation }
  }

  const suffixIndex = requestedLocation.search(/[?#]/)
  if (suffixIndex === -1) {
    return { hydratePath: requestedLocation }
  }

  // A bare `?` or `#` addresses the same path with nothing to adopt.
  const suffix = requestedLocation.slice(suffixIndex)
  if (!/[^?#]/.test(suffix)) {
    return { hydratePath: requestedLocation }
  }

  // An empty path is the site root: the router has no current route to resolve
  // it against on its first navigation.
  return {
    hydratePath: requestedLocation.slice(0, suffixIndex) || '/',
    adoptPath: requestedLocation,
  }
}
