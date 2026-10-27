import { describe, expect, it } from 'vitest'
import { resolveHydrationPlan } from './hydration-plan'
import { NOT_FOUND_ROUTE_PATH } from './not-found'

/** A page table with the pages these cases talk about. */
function hasPage(path: string): boolean {
  return ['/guide/routing', '/guide/getting-started', '/guide/路由', '/'].includes(path)
}

describe('resolveHydrationPlan', () => {
  it('starts on a plain path in place', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing',
      hasPage,
    })).toEqual({ startPath: '/guide/routing' })
  })

  it('starts on the path without its query and adopts the full URL', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing?from=search',
      hasPage,
    })).toEqual({
      startPath: '/guide/routing',
      adoptPath: '/guide/routing?from=search',
    })
  })

  it('starts on the path without its hash and adopts the full URL', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing#dead-links',
      hasPage,
    })).toEqual({
      startPath: '/guide/routing',
      adoptPath: '/guide/routing#dead-links',
    })
  })

  it('drops the query and the hash together', () => {
    // The history hands over locations without the site base, which is why the
    // plan never has to know how the site is deployed.
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/routing?from=search#dead-links',
      hasPage,
    })).toEqual({
      startPath: '/guide/routing',
      adoptPath: '/guide/routing?from=search#dead-links',
    })
  })

  it('treats a bare query or hash separator as nothing to adopt', () => {
    for (const requestedLocation of ['/guide/routing?', '/guide/routing#', '/guide/routing?#']) {
      expect(resolveHydrationPlan({
        isNotFoundDocument: false,
        requestedLocation,
        hasPage,
      })).toEqual({ startPath: '/guide/routing' })
    }
  })

  it('starts on the site root when the query addresses an empty path', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '?from=search',
      hasPage,
    })).toEqual({
      startPath: '/',
      adoptPath: '/?from=search',
    })
  })

  it('starts on the not-found route and adopts the requested URL', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedLocation: '/guide/this-page-does-not-exist',
      hasPage,
    })).toEqual({
      startPath: NOT_FOUND_ROUTE_PATH,
      adoptPath: '/guide/this-page-does-not-exist',
    })
  })

  it('keeps the query and the hash of the not-found URL for the adoption', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedLocation: '/en/missing?q=1#top',
      hasPage,
    })).toEqual({
      startPath: NOT_FOUND_ROUTE_PATH,
      adoptPath: '/en/missing?q=1#top',
    })
  })

  it('starts on the decoded page when an encoded path names one', () => {
    // The site prerendered the decoded route, so the first render has to use it
    // too; the address bar follows right after mounting.
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/%E8%B7%AF%E7%94%B1?from=search#dead-links',
      hasPage,
    })).toEqual({
      startPath: '/guide/路由',
      adoptPath: '/guide/路由?from=search#dead-links',
      replacePath: '/guide/路由?from=search#dead-links',
    })
  })

  it('corrects the address bar of a decoded page without a query or hash', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/%E8%B7%AF%E7%94%B1',
      hasPage,
    })).toEqual({
      startPath: '/guide/路由',
      replacePath: '/guide/路由',
    })
  })

  it('decodes a path that names no page without touching the address bar', () => {
    // Dev renders unknown URLs at their own path, so its HTML is hydrated as it is.
    expect(resolveHydrationPlan({
      isNotFoundDocument: false,
      requestedLocation: '/guide/%E4%B8%8D%E5%AD%98%E5%9C%A8',
      hasPage,
    })).toEqual({ startPath: '/guide/不存在' })
  })

  it('corrects the address bar of the not-found document for an encoded path', () => {
    expect(resolveHydrationPlan({
      isNotFoundDocument: true,
      requestedLocation: '/guide/%E4%B8%8D%E5%AD%98%E5%9C%A8?q=1',
      hasPage,
    })).toEqual({
      startPath: NOT_FOUND_ROUTE_PATH,
      adoptPath: '/guide/不存在?q=1',
      replacePath: '/guide/不存在?q=1',
    })
  })
})
