import { describe, expect, it } from 'vitest'
import {
  NOT_FOUND_ROUTE_NAME,
  NOT_FOUND_ROUTE_PATH,
  resolveHydrationPlan,
} from './not-found'

describe('resolveHydrationPlan', () => {
  it('hydrates the not-found document with the route it was rendered with', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedPath: '/guide/this-page-does-not-exist',
      routeName: NOT_FOUND_ROUTE_NAME,
    })).toEqual({
      hydratePath: NOT_FOUND_ROUTE_PATH,
      adoptPath: '/guide/this-page-does-not-exist',
    })
  })

  it('keeps the query and the hash of the requested URL for the adoption', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedPath: '/en/missing?q=1#top',
      routeName: NOT_FOUND_ROUTE_NAME,
    })).toEqual({
      hydratePath: NOT_FOUND_ROUTE_PATH,
      adoptPath: '/en/missing?q=1#top',
    })
  })

  it('hydrates in place when the document is not the prerendered not-found one', () => {
    // Dev renders unknown URLs at their own path, so its HTML has to be
    // hydrated as it is.
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedPath: '/guide/this-page-does-not-exist',
      routeName: NOT_FOUND_ROUTE_NAME,
    })).toEqual({ hydratePath: '/guide/this-page-does-not-exist' })
  })

  it('hydrates in place when the requested URL resolves to a page', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedPath: '/guide/getting-started',
      routeName: '/guide/getting-started',
    })).toEqual({ hydratePath: '/guide/getting-started' })
  })
})
