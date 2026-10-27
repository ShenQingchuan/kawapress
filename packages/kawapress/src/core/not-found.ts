/**
 * The not-found page is rendered once, at {@link NOT_FOUND_ROUTE_PATH}, and
 * written to `404.html`. Static hosts and `kawapress preview` answer every
 * unknown URL with that one document while the browser keeps the URL the
 * visitor opened, so both sides need to agree on how the client recognises that
 * document. Which route it renders first is part of
 * {@link import('./hydration-plan').resolveHydrationPlan}.
 */

/** Route the not-found document is rendered with. */
export const NOT_FOUND_ROUTE_PATH = '/404'

/**
 * `<meta>` name that only the prerendered not-found document carries. Dev
 * renders every URL at its own path, so its HTML must not be mistaken for the
 * shared 404 document.
 */
export const NOT_FOUND_DOCUMENT_META = 'kawapress-not-found'

export function renderNotFoundDocumentMeta(): string {
  return `<meta name="${NOT_FOUND_DOCUMENT_META}" content="true">`
}
