// @vitest-environment happy-dom

import type { PageTable } from '../../core/page-manifest'
import type { Router } from '../../core/router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installLinkInterceptor } from './link-interceptor'

const push = vi.fn(async () => {})

const pages: PageTable = {
  '/': async () => ({ default: { name: 'Home' } }),
  '/guide/intro': async () => ({ default: { name: 'Intro' } }),
  '/guide/routing': async () => ({ default: { name: 'Routing' } }),
}

const router: Router = {
  currentRoute: { value: { path: '/', fullPath: '/', query: {}, hash: '', found: true } } as Router['currentRoute'],
  push,
  replace: async () => {},
  beforeEach: () => () => {},
  afterEach: () => () => {},
}

function createAnchor(attributes: Record<string, string>, text = 'link'): HTMLAnchorElement {
  const anchor = document.createElement('a')
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value)
  }
  anchor.textContent = text
  document.body.append(anchor)
  return anchor
}

/** Clicks an element the way a reader would, without letting happy-dom navigate. */
function click(anchor: HTMLElement, init: MouseEventInit = {}): void {
  anchor.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }),
  )
}

beforeEach(() => {
  installLinkInterceptor(router, pages, '/')
  // Registered after the interceptor, so the decision under test was already
  // made; this only stops happy-dom from loading another document.
  window.addEventListener('click', (event) => {
    event.preventDefault()
  })
  push.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('installLinkInterceptor', () => {
  it('sends an internal link through the router', () => {
    const anchor = createAnchor({ href: '/guide/routing?from=nav#top' })

    click(anchor)

    expect(push).toHaveBeenCalledWith('/guide/routing?from=nav#top')
  })

  it('intercepts a same-origin link written as an absolute URL', () => {
    const anchor = createAnchor({ href: `${window.location.origin}/guide/intro` })

    click(anchor)

    expect(push).toHaveBeenCalledWith('/guide/intro')
  })

  it('leaves an external link to the browser', () => {
    click(createAnchor({ href: 'https://example.com/guide/routing' }))

    expect(push).not.toHaveBeenCalled()
  })

  it('leaves URLs without an origin to the browser', () => {
    for (const href of ['mailto:hi@example.com', 'tel:+123', 'javascript:void 0']) {
      click(createAnchor({ href }))
    }
    expect(push).not.toHaveBeenCalled()
  })

  it('leaves a path the page table does not know to the browser', () => {
    // Only the server can answer that URL with the not-found document.
    click(createAnchor({ href: '/guide/missing' }))

    expect(push).not.toHaveBeenCalled()
  })

  it('leaves a bare fragment to the browser', () => {
    click(createAnchor({ href: '#top' }))

    expect(push).not.toHaveBeenCalled()
  })

  it('ignores modifier clicks and other buttons', () => {
    for (const init of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      click(createAnchor({ href: '/guide/intro' }), init)
    }
    expect(push).not.toHaveBeenCalled()
  })

  it('ignores anchors that ask for another window or a download', () => {
    click(createAnchor({ href: '/guide/intro', target: '_blank' }))
    click(createAnchor({ href: '/guide/intro', download: '' }))

    expect(push).not.toHaveBeenCalled()
  })

  it('ignores a click that something else already handled', () => {
    const anchor = createAnchor({ href: '/guide/intro' })
    anchor.addEventListener('click', event => event.preventDefault())

    click(anchor)

    expect(push).not.toHaveBeenCalled()
  })

  it('follows a click on a child of the anchor', () => {
    const anchor = createAnchor({ href: '/guide/intro' })
    const child = document.createElement('span')
    child.textContent = 'inside'
    anchor.append(child)

    child.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))

    expect(push).toHaveBeenCalledWith('/guide/intro')
  })

  it('reports a navigation that fails instead of swallowing it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    push.mockRejectedValueOnce(new Error('chunk missing'))
    const anchor = createAnchor({ href: '/guide/intro' })

    click(anchor)
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })
    consoleError.mockRestore()
  })
})
