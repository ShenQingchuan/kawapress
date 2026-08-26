import { describe, expect, it } from 'vitest'
import { markdownPagePathToRoutePath } from './markdown-route'

describe('markdownPagePathToRoutePath', () => {
  it.each([
    ['index.md', '/'],
    ['/index.html', '/'],
    ['guide/getting-started.md', '/guide/getting-started'],
    ['/guide/getting-started.html', '/guide/getting-started'],
    ['/guide/getting-started', '/guide/getting-started'],
    ['guide/index.md', '/guide'],
    ['/guide/index.html', '/guide'],
    [String.raw`guide\nested\index.md`, '/guide/nested'],
  ])('maps %s to %s', (pagePath, routePath) => {
    expect(markdownPagePathToRoutePath(pagePath)).toBe(routePath)
  })
})
