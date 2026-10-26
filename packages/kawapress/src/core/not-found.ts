/**
 * The not-found page is rendered once, at {@link NOT_FOUND_ROUTE_PATH}, and
 * written to `404.html`. Static hosts and `kawapress preview` answer every
 * unknown URL with that one document while the browser keeps the URL the
 * visitor opened, so both sides need to agree on two things: how the client
 * recognises that document, and which route it has to render first.
 */

/** Route the not-found document is rendered with. */
export const NOT_FOUND_ROUTE_PATH = '/404'

/** Name of the router record that renders the not-found page. */
export const NOT_FOUND_ROUTE_NAME = 'not-found'

/**
 * `<meta>` name that only the prerendered not-found document carries. Dev
 * renders every URL at its own path, so its HTML must not be mistaken for the
 * shared 404 document.
 */
export const NOT_FOUND_DOCUMENT_META = 'kawapress-not-found'

export function renderNotFoundDocumentMeta(): string {
  return `<meta name="${NOT_FOUND_DOCUMENT_META}" content="true">`
}

export interface HydrationPlanInput {
  /** Whether the served HTML carries {@link NOT_FOUND_DOCUMENT_META}. */
  isNotFoundDocument: boolean
  /** Location the visitor opened, expressed like a router location. */
  requestedPath: string
  /** Route `requestedPath` resolves to, `null`/`undefined` when nothing matched. */
  routeName: string | symbol | null | undefined
}

export interface HydrationPlan {
  /** Route the client renders first, so the first render matches the HTML. */
  hydratePath: string
  /** Route to move to once the app is hydrated, `undefined` to stay put. */
  adoptPath?: string
}

/**
 * Pick the route for the first client render.
 *
 * The prerendered not-found document was rendered at `/404`, so serving it for
 * `/guide/missing` makes server markup and client render disagree: anything
 * that reads the current route (language links, for example) would rerender
 * with other values and Vue would report a hydration mismatch. Starting on
 * `/404` keeps the first render identical to the served HTML; the requested URL
 * is adopted right afterwards, which is a normal update, not a mismatch.
 */
export function resolveHydrationPlan(
  { isNotFoundDocument, requestedPath, routeName }: HydrationPlanInput,
): HydrationPlan {
  if (!isNotFoundDocument || routeName !== NOT_FOUND_ROUTE_NAME) {
    return { hydratePath: requestedPath }
  }
  return { hydratePath: NOT_FOUND_ROUTE_PATH, adoptPath: requestedPath }
}
