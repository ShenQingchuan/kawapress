import type { PageHeader } from 'kawapress'
import { describe, expect, it } from 'vitest'
import {
  flattenOutlineHeaders,
  getOutlineHeaders,
  resolveActiveOutlineLink,
} from './outline'

function header(
  level: number,
  title: string,
  slug: string,
  children: PageHeader[] = [],
): PageHeader {
  return {
    level,
    title,
    slug,
    link: `#${slug}`,
    children,
  }
}

describe('nagi outline headers', () => {
  it('drops page h1 and keeps nested h2/h3', () => {
    const tree = [
      header(1, 'Page', 'page', [
        header(2, 'Setup', 'setup', [
          header(3, 'Install', 'install'),
        ]),
        header(2, 'Usage', 'usage'),
      ]),
    ]

    expect(getOutlineHeaders(tree).map(item => item.slug)).toEqual([
      'setup',
      'usage',
    ])
    expect(flattenOutlineHeaders(getOutlineHeaders(tree)).map(item => item.slug))
      .toEqual(['setup', 'install', 'usage'])
  })

  it('highlights the last heading that has crossed the scroll offset', () => {
    const headers = [
      { link: '#setup', top: 0 },
      { link: '#install', top: 240 },
      { link: '#usage', top: 480 },
    ]

    expect(resolveActiveOutlineLink(headers, 0, 200, 800)).toBe('#setup')
    expect(resolveActiveOutlineLink(headers, 250, 200, 800)).toBe('#install')
    expect(resolveActiveOutlineLink(headers, 600, 200, 800)).toBe('#usage')
  })

  it('highlights the last heading when the page is at the bottom', () => {
    expect(resolveActiveOutlineLink([
      { link: '#setup', top: 0 },
      { link: '#usage', top: 1200 },
    ], 900, 200, 1100)).toBe('#usage')
  })

  it('returns null when the page has no outline headings', () => {
    expect(resolveActiveOutlineLink([], 0, 200, 400)).toBeNull()
  })
})
