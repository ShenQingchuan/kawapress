import { describe, expect, it } from 'vitest'
import { planPreviewRequest } from './preview-routing'

describe('planPreviewRequest', () => {
  it('serves the home page at the root when the base is "/"', () => {
    expect(planPreviewRequest('/', '/')).toEqual({
      kind: 'static',
      candidates: ['index.html'],
    })
  })

  it('probes the exact file, then the .html page, then the directory index', () => {
    expect(planPreviewRequest('/guide/routing', '/')).toEqual({
      kind: 'static',
      candidates: [
        'guide/routing',
        'guide/routing.html',
        'guide/routing/index.html',
      ],
    })
  })

  it('only probes the directory index for paths with a trailing slash', () => {
    expect(planPreviewRequest('/guide/routing/', '/')).toEqual({
      kind: 'static',
      candidates: ['guide/routing/index.html'],
    })
  })

  it('keeps file extensions such as the generated Markdown pages', () => {
    expect(planPreviewRequest('/guide/routing.md?raw=1#top', '/')).toEqual({
      kind: 'static',
      candidates: [
        'guide/routing.md',
        'guide/routing.md.html',
        'guide/routing.md/index.html',
      ],
    })
  })

  it('redirects the root to a non-root base', () => {
    expect(planPreviewRequest('/', '/kawapress/')).toEqual({
      kind: 'redirect',
      location: '/kawapress/',
    })
  })

  it('normalizes the base before matching requests', () => {
    expect(planPreviewRequest('/kawapress/guide/routing.md', '/kawapress')).toEqual({
      kind: 'static',
      candidates: [
        'guide/routing.md',
        'guide/routing.md.html',
        'guide/routing.md/index.html',
      ],
    })
  })

  it('serves the base itself as the home page', () => {
    expect(planPreviewRequest('/kawapress', '/kawapress/')).toEqual({
      kind: 'static',
      candidates: ['index.html'],
    })
  })

  it('reports paths outside the base as not found', () => {
    expect(planPreviewRequest('/guide/routing', '/kawapress/')).toEqual({
      kind: 'not-found',
    })
  })

  it('rejects path segments that would escape the build output', () => {
    expect(planPreviewRequest('/../kawapress.config.ts', '/')).toEqual({
      kind: 'not-found',
    })
    expect(planPreviewRequest('/%2e%2e/secret', '/')).toEqual({
      kind: 'not-found',
    })
  })
})
