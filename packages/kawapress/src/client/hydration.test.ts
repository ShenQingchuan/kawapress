// @vitest-environment happy-dom

import type { Router, RouterHistory } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NOT_FOUND_DOCUMENT_META, NOT_FOUND_ROUTE_NAME, NOT_FOUND_ROUTE_PATH } from '../core/not-found'
import { createClientHydration } from './hydration'

function createFakeHistory(location: string) {
  const writes: string[] = []
  const history: RouterHistory = {
    base: '/',
    location,
    state: {},
    createHref: to => to,
    push: (to) => {
      writes.push(`push ${to}`)
    },
    replace: (to) => {
      writes.push(`replace ${to}`)
    },
    go: () => {},
    listen: () => () => {},
    destroy: () => {},
  }
  return { history, writes }
}

function createFakeRouter(routes: Record<string, string>) {
  const replaced: string[] = []
  const router = {
    resolve: (path: string) => ({ name: routes[path] }),
    replace: vi.fn(async (path: string) => {
      replaced.push(path)
    }),
  } as unknown as Router
  return { router, replaced }
}

function markNotFoundDocument(): void {
  const meta = document.createElement('meta')
  meta.name = NOT_FOUND_DOCUMENT_META
  document.head.append(meta)
}

describe('createClientHydration', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('starts on the rendered not-found route without touching the browser history', () => {
    markNotFoundDocument()
    const { history, writes } = createFakeHistory('/guide/missing')
    const { router, replaced } = createFakeRouter({ '/guide/missing': NOT_FOUND_ROUTE_NAME })
    const hydration = createClientHydration(history, () => router)

    expect(hydration.history.location).toBe(NOT_FOUND_ROUTE_PATH)

    hydration.history.replace(NOT_FOUND_ROUTE_PATH, { scroll: null })
    expect(writes).toEqual([])

    return hydration.adoptRequestedUrl().then(() => {
      expect(replaced).toEqual(['/guide/missing'])
      expect(writes).toEqual([])
      expect(hydration.history.location).toBe('/guide/missing')
    })
  })

  it('writes to the browser history again once the URL was adopted', () => {
    markNotFoundDocument()
    const { history, writes } = createFakeHistory('/guide/missing')
    const { router } = createFakeRouter({ '/guide/missing': NOT_FOUND_ROUTE_NAME })
    const hydration = createClientHydration(history, () => router)

    return hydration.adoptRequestedUrl().then(() => {
      hydration.history.push('/guide/getting-started')
      expect(writes).toEqual(['push /guide/getting-started'])
    })
  })

  it('hydrates in place when the router resolves the requested URL to a page', () => {
    markNotFoundDocument()
    const { history, writes } = createFakeHistory('/guide/getting-started')
    const { router, replaced } = createFakeRouter({ '/guide/getting-started': '/guide/getting-started' })
    const hydration = createClientHydration(history, () => router)

    expect(hydration.history.location).toBe('/guide/getting-started')
    hydration.history.replace('/guide/getting-started')
    expect(writes).toEqual(['replace /guide/getting-started'])

    return hydration.adoptRequestedUrl().then(() => {
      expect(replaced).toEqual([])
    })
  })

  it('hydrates in place when the document is not marked as the not-found page', () => {
    const { history } = createFakeHistory('/guide/missing')
    const { router, replaced } = createFakeRouter({ '/guide/missing': NOT_FOUND_ROUTE_NAME })
    const hydration = createClientHydration(history, () => router)

    expect(hydration.history.location).toBe('/guide/missing')

    return hydration.adoptRequestedUrl().then(() => {
      expect(replaced).toEqual([])
    })
  })
})
