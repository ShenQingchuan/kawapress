import type { DeadLink, PageLinks } from './dead-links'
import { describe, expect, it } from 'vitest'
import { findDeadLinks, findPageDeadLinks, formatDeadLink } from './dead-links'

function page(
  route: string,
  links: Array<[href: string, target: string, line?: number]>,
  headings: string[] = [],
): PageLinks {
  return {
    route,
    source: route === '/' ? '/index.md' : `${route}.md`,
    headings,
    links: links.map(([href, target, line = 1]) => ({ href, target, line })),
  }
}

const site = {
  routes: ['/', '/guide', '/guide/intro', '/指南 空间', '/guide/v1.2'],
  headings: new Map([
    ['/', ['welcome']],
    ['/guide', ['guide-setup']],
    ['/guide/intro', ['intro', '%E8%AE%BE%E7%BD%AE']],
    ['/指南 空间', ['space']],
    ['/guide/v1.2', ['version']],
  ]),
  publicFiles: ['/logo.png', '/files/a.pdf', '/.nojekyll'],
}

describe('findPageDeadLinks', () => {
  it('reports a link to a page that does not exist', () => {
    const deadLinks = findPageDeadLinks(
      page('/guide', [['./missing', '/guide/missing', 12]]),
      site,
    )

    expect(deadLinks).toEqual<DeadLink[]>([{
      href: './missing',
      target: '/guide/missing',
      source: '/guide.md',
      line: 12,
      reason: 'missing-page',
    }])
  })

  it.each([
    '/guide',
    '/guide.md',
    '/guide.html',
    '/guide/',
    '/guide/index.md',
    '/guide/index.html',
    '/',
    '/index.md',
    '/guide/intro?mode=quick#intro',
  ])('accepts the page link form %s', (target) => {
    expect(findPageDeadLinks(page('/other', [['x', target]]), site)).toEqual([])
  })

  it('reports a missing anchor on another page', () => {
    expect(findPageDeadLinks(page('/other', [['x', '/guide#nope', 3]]), site))
      .toEqual([expect.objectContaining({ reason: 'missing-anchor', line: 3 })])
    expect(findPageDeadLinks(page('/other', [['x', '/guide#guide-setup']]), site))
      .toEqual([])
  })

  it('checks anchors of the current page', () => {
    const current = page('/guide', [['ok', '#guide-setup'], ['dead', '#nope']], ['guide-setup'])

    expect(findPageDeadLinks(current, site))
      .toEqual([expect.objectContaining({ href: 'dead', target: '#nope', reason: 'missing-anchor' })])
  })

  it('compares percent-encoded paths and anchors by their decoded value', () => {
    const encoded = page('/guide/intro', [
      ['space', '/%E6%8C%87%E5%8D%97%20%E7%A9%BA%E9%97%B4'],
      ['raw anchor', '#设置'],
      ['encoded anchor', '#%E8%AE%BE%E7%BD%AE'],
    ])

    expect(findPageDeadLinks(encoded, site)).toEqual([])
  })

  it('treats links with another extension as public files', () => {
    const links = page('/guide', [
      ['logo', '/logo.png'],
      ['pdf', '/files/a.pdf?v=2'],
      ['plain', '/.nojekyll'],
      ['dead logo', '/missing.png'],
      ['dead pdf', '/files/missing.pdf'],
    ])

    expect(findPageDeadLinks(links, site)).toEqual([
      expect.objectContaining({ target: '/missing.png', reason: 'missing-file' }),
      expect.objectContaining({ target: '/files/missing.pdf', reason: 'missing-file' }),
    ])
  })

  it('prefers a page route over a public file with the same dotted path', () => {
    expect(findPageDeadLinks(page('/guide', [['version', '/guide/v1.2#version']]), site))
      .toEqual([])
  })

  it('reports a missing page instead of a missing anchor', () => {
    expect(findPageDeadLinks(page('/guide', [['x', '/gone#nope']]), site))
      .toEqual([expect.objectContaining({ reason: 'missing-page' })])
  })

  it('ignores links by exact href, exact target, regular expression, or function', () => {
    const links = page('/guide', [
      ['./a.md', '/guide/a'],
      ['/guide/b', '/guide/b'],
      ['./c.md', '/guide/c'],
      ['./d.md', '/guide/d'],
      ['./e.md', '/guide/e'],
    ])

    const deadLinks = findPageDeadLinks(links, site, [
      './a.md',
      '/guide/b',
      /^\.\/c\.md$/,
      link => link.target === '/guide/d',
    ])

    expect(deadLinks.map(link => link.target)).toEqual(['/guide/e'])
  })

  it('does not match an ignore string as a substring', () => {
    expect(findPageDeadLinks(page('/guide', [['x', '/guide/a']]), site, ['guide/a']))
      .toHaveLength(1)
  })

  it('resets stateful regular expressions between links', () => {
    const links = page('/guide', [
      ['./a.md', '/guide/a'],
      ['./a.md', '/guide/a'],
    ])

    expect(findPageDeadLinks(links, site, [/a/g])).toEqual([])
  })
})

describe('findDeadLinks', () => {
  it('checks every page and sorts the report by source and line', () => {
    const pages = [
      page('/guide', [['z', '/guide/z', 9], ['a', '/guide/a', 2]], ['guide']),
      page('/', [['home', '/home', 4]], ['welcome']),
    ]

    expect(findDeadLinks(pages, site).map(formatDeadLink)).toEqual([
      '/guide.md:2  a  missing-page',
      '/guide.md:9  z  missing-page',
      '/index.md:4  home  missing-page',
    ])
  })
})

describe('formatDeadLink', () => {
  it('renders source, line, href, and reason', () => {
    expect(formatDeadLink({
      href: './missing.md',
      target: '/guide/missing',
      source: '/guide/intro.md',
      line: 42,
      reason: 'missing-page',
    })).toBe('/guide/intro.md:42  ./missing.md  missing-page')
  })
})
