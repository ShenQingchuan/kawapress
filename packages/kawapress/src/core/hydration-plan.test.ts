import { describe, expect, it } from 'vitest'
import { resolveHydrationPlan } from './hydration-plan'
import { NOT_FOUND_ROUTE_NAME, NOT_FOUND_ROUTE_PATH } from './not-found'

describe('resolveHydrationPlan', () => {
  it('hydrates a plain path in place', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing',
      routeName: '/guide/routing',
    })).toEqual({ hydratePath: '/guide/routing' })
  })

  it('hydrates the path without its query and adopts the full URL', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing?from=search',
      routeName: '/guide/routing',
    })).toEqual({
      hydratePath: '/guide/routing',
      adoptPath: '/guide/routing?from=search',
    })
  })

  it('hydrates the path without its hash and adopts the full URL', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing#dead-links',
      routeName: '/guide/routing',
    })).toEqual({
      hydratePath: '/guide/routing',
      adoptPath: '/guide/routing#dead-links',
    })
  })

  it('drops the query and the hash together', () => {
    // The history hands over locations without the site base, which is why the
    // plan never has to know how the site is deployed.
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing?from=search#dead-links',
      routeName: '/guide/routing',
    })).toEqual({
      hydratePath: '/guide/routing',
      adoptPath: '/guide/routing?from=search#dead-links',
    })
  })

  it('treats a bare query or hash separator as nothing to adopt', () => {
    for (const requestedLocation of ['/guide/routing?', '/guide/routing#', '/guide/routing?#']) {
      expect(resolveHydrationPlan({
        isNotFoundDocument: false,
        requestedLocation,
        routeName: '/guide/routing',
      })).toEqual({ hydratePath: requestedLocation })
    }
  })

  it('hydrates the site root when the query addresses an empty path', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '?from=search',
      routeName: '/',
    })).toEqual({
      hydratePath: '/',
      adoptPath: '?from=search',
    })
  })

  it('hydrates the not-found document with the route it was rendered with', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedLocation: '/guide/this-page-does-not-exist',
      routeName: NOT_FOUND_ROUTE_NAME,
    })).toEqual({
      hydratePath: NOT_FOUND_ROUTE_PATH,
      adoptPath: '/guide/this-page-does-not-exist',
    })
  })

  it('keeps the query and the hash of the not-found URL for the adoption', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedLocation: '/en/missing?q=1#top',
      routeName: NOT_FOUND_ROUTE_NAME,
    })).toEqual({
      hydratePath: NOT_FOUND_ROUTE_PATH,
      adoptPath: '/en/missing?q=1#top',
    })
  })

  it('hydrates in place when the not-found document serves a real page', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedLocation: '/guide/getting-started',
      routeName: '/guide/getting-started',
    })).toEqual({ hydratePath: '/guide/getting-started' })
  })

  it('hydrates in place when the document is not the prerendered not-found one', () => {
    // Dev renders unknown URLs at their own path, so its HTML has to be
    // hydrated as it is.
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/this-page-does-not-exist',
      routeName: NOT_FOUND_ROUTE_NAME,
    })).toEqual({ hydratePath: '/guide/this-page-does-not-exist' })
  })

  it('keeps an encoded path, which the router redirects to the decoded page', () => {
    // The server renders the decoded path, and the client reaches it through
    // the redirect in the router; the plan only drops the query and the hash.
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/%E8%B7%AF%E7%94%B1?from=search#dead-links',
      routeName: '/guide/%E8%B7%AF%E7%94%B1',
    })).toEqual({
      hydratePath: '/guide/%E8%B7%AF%E7%94%B1',
      adoptPath: '/guide/%E8%B7%AF%E7%94%B1?from=search#dead-links',
    })
  })
})
