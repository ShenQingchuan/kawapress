import type { PageTable } from '../../core/page-manifest'
import { describe, expect, it } from 'vitest'
import { isSamePagePath, parseLocation, parseQuery, resolveRoute, routePathOf } from './route'

const pages: PageTable = {
  '/': async () => ({ default: { name: 'Home' } }),
  '/guide/intro': async () => ({ default: { name: 'Intro' } }),
  '/guide/路由': async () => ({ default: { name: 'Routing' } }),
}

describe('parseLocation', () => {
  it('splits a location into path, query and hash', () => {
    expect(parseLocation('/guide/intro?from=nav&page=2#top')).toEqual({
      path: '/guide/intro',
      search: '?from=nav&page=2',
      hash: '#top',
    })
  })

  it('keeps the delimiters with query and hash, and defaults the path', () => {
    expect(parseLocation('?from=nav')).toEqual({ path: '/', search: '?from=nav', hash: '' })
    expect(parseLocation('#top')).toEqual({ path: '/', search: '', hash: '#top' })
    expect(parseLocation('')).toEqual({ path: '/', search: '', hash: '' })
  })

  it('adds the leading slash a bare path may lack', () => {
    expect(parseLocation('guide/intro').path).toBe('/guide/intro')
  })

  it('decodes a percent-encoded path, because pages are keyed by the written path', () => {
    expect(parseLocation('/guide/%E8%B7%AF%E7%94%B1').path).toBe('/guide/路由')
  })

  it('keeps a path that cannot be decoded', () => {
    expect(parseLocation('/guide/%E4%B8').path).toBe('/guide/%E4%B8')
  })
})

describe('parseQuery', () => {
  it('reads every key as a string', () => {
    expect(parseQuery('?from=nav&page=2')).toEqual({ from: 'nav', page: '2' })
  })

  it('collects a repeated key in order', () => {
    expect(parseQuery('?tag=vue&tag=markdown&tag=ssg')).toEqual({
      tag: ['vue', 'markdown', 'ssg'],
    })
  })

  it('decodes names and values and keeps an empty one', () => {
    expect(parseQuery('?a%20b=c%2Fd&empty')).toEqual({ 'a b': 'c/d', 'empty': '' })
  })

  it('reads an empty query as no keys', () => {
    expect(parseQuery('')).toEqual({})
    expect(parseQuery('?')).toEqual({})
  })
})

describe('resolveRoute', () => {
  it('marks a page of the table as found and keeps the full path', () => {
    expect(resolveRoute('/guide/intro?from=nav#top', pages)).toEqual({
      path: '/guide/intro',
      fullPath: '/guide/intro?from=nav#top',
      query: { from: 'nav' },
      hash: '#top',
      found: true,
    })
  })

  it('marks a path the table does not know as not found', () => {
    const route = resolveRoute('/guide/missing', pages)

    expect(route.found).toBe(false)
    expect(route.path).toBe('/guide/missing')
  })

  it('looks a page up by its decoded path', () => {
    expect(resolveRoute('/guide/%E8%B7%AF%E7%94%B1', pages)).toMatchObject({
      path: '/guide/路由',
      found: true,
    })
  })
})

describe('routePathOf', () => {
  it('drops query and hash', () => {
    expect(routePathOf('/guide/intro?from=nav#top')).toBe('/guide/intro')
  })
})

describe('isSamePagePath', () => {
  it('ignores a trailing slash but nothing else', () => {
    expect(isSamePagePath('/guide/intro/', '/guide/intro')).toBe(true)
    expect(isSamePagePath('/', '/')).toBe(true)
    expect(isSamePagePath('/guide/intro', '/guide')).toBe(false)
  })
})
