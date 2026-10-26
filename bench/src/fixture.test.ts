import { describe, expect, it } from 'vitest'
import { createFixture } from './fixture.ts'

describe('createFixture', () => {
  it('produces identical content on every call', () => {
    expect(createFixture(12)).toEqual(createFixture(12))
  })

  it('generates the requested number of guide pages plus one home page', () => {
    const fixture = createFixture(7)
    expect(fixture.size).toBe(7)
    expect(fixture.pages).toHaveLength(7)
    expect(fixture.pages.map(page => page.file)).toEqual([
      'guide/page-0001.md',
      'guide/page-0002.md',
      'guide/page-0003.md',
      'guide/page-0004.md',
      'guide/page-0005.md',
      'guide/page-0006.md',
      'guide/page-0007.md',
    ])
    expect(fixture.home.file).toBe('index.md')
    expect(fixture.home.route).toBe('/')
  })

  it('only links to pages that exist', () => {
    const fixture = createFixture(20)
    const routes = new Set([fixture.home.route, ...fixture.pages.map(page => page.route)])
    for (const page of [fixture.home, ...fixture.pages]) {
      const links = [...page.markdown.matchAll(/\]\(([^)\s]+)\)/g)].map(match => match[1]!)
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        expect({ page: page.file, link, exists: routes.has(link) })
          .toEqual({ page: page.file, link, exists: true })
      }
    }
  })

  it('gives every guide page the elements both generators must render', () => {
    const page = createFixture(5).pages[0]!
    expect(page.markdown.startsWith('---\ntitle: ')).toBe(true)
    expect(page.markdown).toMatch(/^# /m)
    expect(page.markdown).toMatch(/^## /m)
    expect(page.markdown).toMatch(/^### /m)
    expect(page.markdown).toContain('| Option | Type | Default |')
    expect(page.markdown).toContain('```ts')
    expect(page.markdown).toContain('```bash')
    expect(page.markdown).toMatch(/^- /m)
    expect(page.markdown).toMatch(/`[^`\n]+`/)
  })

  it('scales to the sizes the report uses', () => {
    expect(createFixture(50).pages).toHaveLength(50)
    expect(createFixture(2000).pages).toHaveLength(2000)
  })

  it('rejects sizes it cannot generate', () => {
    expect(() => createFixture(2)).toThrowError(/at least 3/)
    expect(() => createFixture(4.5)).toThrowError(/at least 3/)
  })
})
