import type { PageHeader } from 'kawapress'
import { describe, expect, it } from 'vitest'
import {
  findOutlineHeaderByHash,
  flattenOutlineHeaders,
  getOutlineHeaders,
  resolveActiveOutlineLink,
  resolveDisplayedOutlineLink,
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

  it('finds the heading addressed by an encoded URL hash', () => {
    const headers = [
      header(2, '部署到子路径', '部署到子路径'),
      header(2, 'Usage', 'usage'),
    ]

    expect(findOutlineHeaderByHash(
      headers,
      '#%E9%83%A8%E7%BD%B2%E5%88%B0%E5%AD%90%E8%B7%AF%E5%BE%84',
    )?.slug).toBe('部署到子路径')
    expect(findOutlineHeaderByHash(headers, '#usage:~:text=example')?.slug)
      .toBe('usage')
    expect(findOutlineHeaderByHash(headers, '#missing')).toBeUndefined()
  })

  it('uses the first heading until the measured active link is ready', () => {
    const headers = [
      header(2, 'Setup', 'setup', [
        header(3, 'Install', 'install'),
      ]),
      header(2, 'Usage', 'usage'),
    ]

    expect(resolveDisplayedOutlineLink(headers, null)).toBe('#setup')
    expect(resolveDisplayedOutlineLink(headers, '#install')).toBe('#install')
    expect(resolveDisplayedOutlineLink(headers, '#old-page-heading')).toBe('#setup')
    expect(resolveDisplayedOutlineLink([], null)).toBeNull()
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
