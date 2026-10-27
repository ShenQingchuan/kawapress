import { withBase } from '../../core/base'

/** The parts of `window.location` a document reload needs, so tests can pass a stub. */
export interface ReloadTarget {
  pathname: string
  search: string
  hash: string
  assign: (url: string) => void
}

/**
 * Loads `location` as a whole new document.
 *
 * A page chunk that cannot be loaded is usually a stale page table after a
 * redeploy: the chunk it names does not exist any more, so the current document
 * cannot show the page by itself. Asking the server for fresh HTML is the only
 * way out, and it also revalidates everything else the old document holds.
 *
 * @returns `false` when the target is already the open document, which would
 * repeat the very same failure; the caller reports the error instead.
 */
export function reloadDocument(
  location: string,
  base: string,
  target: ReloadTarget = window.location,
): boolean {
  const url = withBase(location, base)
  const current = `${target.pathname}${target.search}${target.hash}`
  if (url === current) {
    return false
  }
  target.assign(url)
  return true
}
