import { withBase, withoutBase } from '../../core/base'

/**
 * Where the router reads and writes the current location. The browser
 * implementation talks to `window.history`; the server keeps a plain string,
 * which is all an SSR render needs.
 */
export interface RouteHistory {
  /** Current location, site base already removed; the path stays percent-encoded. */
  location: () => string
  push: (location: string) => void
  replace: (location: string) => void
  /** Calls `listener` whenever the browser moves through its own history. */
  listen: (listener: (location: string) => void) => () => void
}

/** History of the browser: `pushState`/`replaceState` plus back and forward. */
export function createBrowserHistory(base: string): RouteHistory {
  const readLocation = (): string => {
    const path = withoutBase(window.location.pathname, base) ?? '/'
    return `${path}${window.location.search}${window.location.hash}`
  }

  return {
    location: readLocation,
    push(location) {
      window.history.pushState(null, '', withBase(location, base))
    },
    replace(location) {
      window.history.replaceState(null, '', withBase(location, base))
    },
    listen(listener) {
      const onPopState = () => listener(readLocation())
      window.addEventListener('popstate', onPopState)
      return () => window.removeEventListener('popstate', onPopState)
    },
  }
}

/** History of a server render: one location, no entries and no events. */
export function createMemoryHistory(location = '/'): RouteHistory {
  let current = location
  return {
    location: () => current,
    push(next) {
      current = next
    },
    replace(next) {
      current = next
    },
    listen: () => () => {},
  }
}
