// @vitest-environment happy-dom

import type { App } from 'vue'
import type { NagiSidebarItem } from '../sidebar'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import SidebarItem from './SidebarItem.vue'

const testState = vi.hoisted(() => ({
  base: '/',
  // Mirrors the contract of the core helper: prefix an internal path with the
  // site base, leave absolute URLs and hashes alone.
  withBase: vi.fn((path: string, base: string) => {
    if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(path) || path.startsWith('#')) {
      return path
    }
    return base === '/' ? path : `${base.replace(/\/$/, '')}${path}`
  }),
}))

vi.mock('kawapress/client', () => ({
  useSite: () => ({ value: { base: testState.base } }),
  withBase: (path: string, base: string) => testState.withBase(path, base),
}))

let app: App<Element> | undefined

beforeEach(() => {
  testState.base = '/'
  testState.withBase.mockClear()
  document.body.innerHTML = '<div id="app"></div>'
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('sidebar item links', () => {
  it('marks the current page, and only the current page, as active', async () => {
    mount({
      text: 'Group',
      items: [
        { text: 'Routing', link: '/guide/routing' },
        // A trailing slash and a hash must not change which page is active.
        { text: 'Routing anchor', link: '/guide/routing/#section' },
        { text: 'Markdown', link: '/guide/markdown' },
      ],
    }, '/guide/routing')

    const links = document.querySelectorAll<HTMLAnchorElement>('.nagi-sidebar-item__link')
    expect(links).toHaveLength(3)
    expect(links[0]!.classList.contains('is-active')).toBe(true)
    expect(links[0]!.getAttribute('aria-current')).toBe('page')
    expect(links[1]!.classList.contains('is-active')).toBe(true)
    expect(links[1]!.getAttribute('aria-current')).toBe('page')
    expect(links[2]!.classList.contains('is-active')).toBe(false)
    expect(links[2]!.hasAttribute('aria-current')).toBe(false)
  })

  it('compares the active path without query or trailing slash', async () => {
    mount({ text: 'Routing', link: '/guide/routing' }, '/guide/routing/')

    const link = document.querySelector<HTMLAnchorElement>('.nagi-sidebar-item__link')!
    expect(link.classList.contains('is-active')).toBe(true)
  })

  it('applies the site base to internal links and leaves external ones alone', async () => {
    testState.base = '/kawapress/'
    mount({
      text: 'Group',
      items: [
        { text: 'Routing', link: '/guide/routing' },
        { text: 'GitHub', link: 'https://github.com/kawapress/kawapress' },
      ],
    }, '/kawapress/guide/routing')

    const links = document.querySelectorAll<HTMLAnchorElement>('.nagi-sidebar-item__link')
    expect(links[0]!.getAttribute('href')).toBe('/kawapress/guide/routing')
    expect(links[1]!.getAttribute('href')).toBe('https://github.com/kawapress/kawapress')
    expect(testState.withBase).toHaveBeenCalledWith('/guide/routing', '/kawapress/')
    // External links stay plain links; they must never look like the current page.
    expect(links[1]!.classList.contains('is-active')).toBe(false)
  })

  it('emits navigate when any link is clicked', async () => {
    const navigations = mount({
      text: 'Group',
      items: [{ text: 'Routing', link: '/guide/routing' }],
    }, '/guide/routing')

    document.querySelector<HTMLAnchorElement>('.nagi-sidebar-item__link')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(navigations).toHaveLength(1)
  })
})

function mount(value: NagiSidebarItem, activePath: string): number[] {
  const navigations: number[] = []
  app = createApp({
    render: () => h(SidebarItem, {
      item: value,
      activePath,
      onNavigate: () => navigations.push(1),
    }),
  })
  app.mount('#app')
  return navigations
}
