// @vitest-environment happy-dom

import type { App } from 'vue'
import type { PageModule, PageTable } from '../../core/page-manifest'
import type { RouteHistory } from './history'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { routerKey } from './injection'
import { createRouter } from './router'
import RouterLink from './RouterLink'

const pages: PageTable = {
  '/guide/intro': async (): Promise<PageModule> => ({ default: { name: 'Intro' } }),
  '/guide/routing': async (): Promise<PageModule> => ({ default: { name: 'Routing' } }),
}

const history: RouteHistory = {
  location: () => '/guide/intro',
  push: () => {},
  replace: () => {},
  listen: () => () => {},
}

let app: App<Element> | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
})

async function mount(props: { to: string } & Record<string, unknown>): Promise<HTMLAnchorElement> {
  const router = createRouter({ pages, history })
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(defineComponent({
    setup: () => () => h(RouterLink, props, { default: () => 'label' }),
  }))
  app.provide(routerKey, router)
  await router.enter(history.location())
  app.mount(host)
  return host.querySelector('a')!
}

describe('routerLink', () => {
  it('renders a plain anchor with the site base applied', async () => {
    const anchor = await mount({ to: '/guide/routing' })

    expect(anchor.getAttribute('href')).toBe('/guide/routing')
    expect(anchor.textContent).toBe('label')
  })

  it('marks the current page', async () => {
    const anchor = await mount({ to: '/guide/intro' })

    expect(anchor.getAttribute('aria-current')).toBe('page')
  })

  it('ignores a trailing slash when it compares paths', async () => {
    const anchor = await mount({ to: '/guide/intro/' })

    expect(anchor.getAttribute('aria-current')).toBe('page')
  })

  it('leaves aria-current off every other link', async () => {
    const anchor = await mount({ to: '/guide/routing' })

    expect(anchor.hasAttribute('aria-current')).toBe(false)
  })

  it('passes other attributes through to the anchor', async () => {
    const anchor = await mount({ to: '/guide/routing', class: 'nav-link', target: '_blank' })

    expect(anchor.className).toBe('nav-link')
    expect(anchor.getAttribute('target')).toBe('_blank')
  })

  it('keeps a query and a hash in the href', async () => {
    const anchor = await mount({ to: '/guide/intro?from=nav#top' })

    expect(anchor.getAttribute('href')).toBe('/guide/intro?from=nav#top')
    expect(anchor.getAttribute('aria-current')).toBe('page')
  })
})
