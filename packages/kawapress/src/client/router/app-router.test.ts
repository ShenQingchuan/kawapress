// @vitest-environment happy-dom

import type { Component } from 'vue'
import type { PageModule, PageTable } from '../../core/page-manifest'
import type { Route } from '../../core/router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent } from 'vue'
import { createAppRouter } from './app-router'
import { routerKey } from './injection'
import { createRouter } from './router'

const Home: Component = { name: 'Home' }
const Intro: Component = { name: 'Intro' }

function page(component: Component): () => Promise<PageModule> {
  return async () => ({ default: component })
}

const pages: PageTable = {
  '/': page(Home),
  '/guide/intro': page(Intro),
}

interface HappyDomWindow extends Window {
  happyDOM: { setURL: (url: string) => void }
}

function setUrl(url: string): void {
  (window as unknown as HappyDomWindow).happyDOM.setURL(`http://localhost:3000${url}`)
}

function markNotFoundDocument(): void {
  const meta = document.createElement('meta')
  meta.name = 'kawapress-not-found'
  meta.content = 'true'
  document.head.append(meta)
}

beforeEach(() => {
  setUrl('/')
  document.head.innerHTML = ''
  vi.spyOn(window.history, 'pushState')
  vi.spyOn(window.history, 'replaceState')
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('createAppRouter', () => {
  it('starts on the path of the served document', async () => {
    setUrl('/guide/intro?from=nav#top')
    const { router, start, adoptRequestedUrl } = createAppRouter(pages)

    await start()

    expect(router.currentRoute.value).toEqual({
      path: '/guide/intro',
      fullPath: '/guide/intro',
      query: {},
      hash: '',
      found: true,
    })
    expect(window.history.pushState).not.toHaveBeenCalled()

    // The query and the hash are adopted without a navigation or an entry.
    await adoptRequestedUrl()

    expect(router.currentRoute.value.fullPath).toBe('/guide/intro?from=nav#top')
    expect(window.history.pushState).not.toHaveBeenCalled()
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })

  it('starts on the not-found route of the served 404 document', async () => {
    setUrl('/guide/missing')
    markNotFoundDocument()
    const { router, start, adoptRequestedUrl } = createAppRouter(pages)

    await start()

    expect(router.currentRoute.value.path).toBe('/404')
    expect(router.currentRoute.value.found).toBe(false)

    await adoptRequestedUrl()

    // The address bar keeps the requested URL, which the route now names too.
    expect(router.currentRoute.value.path).toBe('/guide/missing')
    expect(router.currentRoute.value.found).toBe(false)
    expect(window.history.pushState).not.toHaveBeenCalled()
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })

  it('replaces an encoded page path with the decoded one', async () => {
    setUrl('/guide/%69ntro')
    const { router, start, adoptRequestedUrl } = createAppRouter(pages)

    await start()
    expect(router.currentRoute.value.path).toBe('/guide/intro')

    await adoptRequestedUrl()

    expect(window.history.replaceState).toHaveBeenCalledTimes(1)
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/guide/intro')
    expect(window.history.pushState).not.toHaveBeenCalled()
  })
})

describe('route state', () => {
  it('hands out the current route through the composable', async () => {
    const router = createRouter({
      pages,
      history: {
        location: () => '/',
        push: () => {},
        replace: () => {},
        listen: () => () => {},
      },
    })
    const { useRoute, useRouter } = await import('./injection')
    let seen: Route | undefined

    const app = createApp(defineComponent({
      setup: () => {
        seen = useRoute().value
        expect(useRouter().currentRoute.value).toBe(seen)
        return () => null
      },
    }))
    app.provide(routerKey, router)
    app.mount(document.createElement('div'))

    expect(seen?.path).toBe('/')
    app.unmount()
  })
})
