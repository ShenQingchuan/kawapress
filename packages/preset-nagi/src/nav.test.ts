import { describe, expect, it } from 'vitest'
import { isNavItemActive } from './nav'

describe('isNavItemActive', () => {
  it('matches only the page itself without activeMatch', () => {
    const item = { text: 'Start', link: '/guide/getting-started' }
    expect(isNavItemActive(item, '/guide/getting-started')).toBe(true)
    expect(isNavItemActive(item, '/guide/getting-started/')).toBe(true)
    expect(isNavItemActive(item, '/guide/routing')).toBe(false)
  })

  it('keeps a section active below its prefix', () => {
    const item = { text: 'Guide', link: '/guide/what-is-kawapress', activeMatch: '/guide' }
    expect(isNavItemActive(item, '/guide/routing')).toBe(true)
    expect(isNavItemActive(item, '/guide')).toBe(true)
    expect(isNavItemActive(item, '/guidebook/routing')).toBe(false)
    expect(isNavItemActive(item, '/plugins/mermaid')).toBe(false)
  })

  it('ignores query and hash', () => {
    const item = { text: 'Guide', link: '/guide/a', activeMatch: '/guide' }
    expect(isNavItemActive(item, '/guide/routing?x=1#top')).toBe(true)
  })
})
