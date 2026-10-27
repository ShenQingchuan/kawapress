import type { Component } from 'vue'
import type { PageModule, PageTable } from '../../core/page-manifest'
import type { RouteHistory } from './history'
import { describe, expect, it, vi } from 'vitest'
import { createRouter } from './router'

const Home: Component = { name: 'Home' }
const Intro: Component = { name: 'Intro' }
const Routing: Component = { name: 'Routing' }

function page(component: Component): () => Promise<PageModule> {
  return async () => ({ default: component })
}

interface FakeHistory {
  history: RouteHistory
  /** Every write the router made, in order. */
  writes: string[]
  /** What the browser does on back or forward. */
  go: (location: string) => void
}

function createFakeHistory(initial: string): FakeHistory {
  let current = initial
  const listeners: ((location: string) => void)[] = []
  const writes: string[] = []

  return {
    writes,
    history: {
      location: () => current,
      push(location) {
        writes.push(`push ${location}`)
        current = location
      },
      replace(location) {
        writes.push(`replace ${location}`)
        current = location
      },
      listen(listener) {
        listeners.push(listener)
        return () => {}
      },
    },
    go(location) {
      current = location
      for (const listener of listeners) {
        listener(location)
      }
    },
  }
}

function deferred<T>(): { promise: Promise<T>, resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function setup(initial = '/', table?: PageTable) {
  const pages: PageTable = table ?? {
    '/': page(Home),
    '/guide/intro': page(Intro),
    '/guide/routing': page(Routing),
  }
  const { history, writes, go } = createFakeHistory(initial)
  const router = createRouter({ pages, history })
  return { router, writes, go, pages }
}

describe('createRouter', () => {
  it('starts on the location the history reports', () => {
    const { router } = setup('/guide/intro')

    expect(router.currentRoute.value).toMatchObject({
      path: '/guide/intro',
      found: true,
    })
  })

  it('loads the page and writes one history entry', async () => {
    const { router, writes } = setup()

    await router.push('/guide/routing?from=nav#top')

    expect(router.currentRoute.value).toMatchObject({
      path: '/guide/routing',
      fullPath: '/guide/routing?from=nav#top',
      query: { from: 'nav' },
      hash: '#top',
      found: true,
    })
    expect(router.page.value).toBe(Routing)
    expect(writes).toEqual(['push /guide/routing?from=nav#top'])
  })

  it('replaces the history entry instead of adding one', async () => {
    const { router, writes } = setup()

    await router.replace('/guide/intro')

    expect(writes).toEqual(['replace /guide/intro'])
  })

  it('renders the not-found page for a path the table does not know', async () => {
    const { router, writes } = setup()

    await router.push('/guide/missing')

    expect(router.currentRoute.value.found).toBe(false)
    expect(router.page.value).toBeNull()
    expect(writes).toEqual(['push /guide/missing'])
  })

  it('keeps the page loaded when only the hash changes', async () => {
    const load = vi.fn(page(Routing))
    const { router } = setup('/', { '/guide/routing': load })
    await router.push('/guide/routing')

    await router.push('/guide/routing#details')

    expect(load).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.hash).toBe('#details')
    expect(router.page.value).toBe(Routing)
  })

  it('updates the query without loading the page again', async () => {
    const load = vi.fn(page(Routing))
    const { router } = setup('/', { '/guide/routing': load })
    await router.push('/guide/routing')

    await router.push('/guide/routing?from=search')

    expect(load).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.query).toEqual({ from: 'search' })
  })

  it('keeps the later navigation when an earlier page loads last', async () => {
    const slow = deferred<PageModule>()
    const { router, writes } = setup('/', {
      '/slow': () => slow.promise,
      '/fast': page(Intro),
    })

    const first = router.push('/slow')
    await router.push('/fast')
    slow.resolve({ default: Routing })
    await first

    expect(router.currentRoute.value.path).toBe('/fast')
    expect(router.page.value).toBe(Intro)
    // The superseded navigation never committed, so it wrote no entry either.
    expect(writes).toEqual(['push /fast'])
  })

  it('drops a history entry of a navigation the browser has already left', async () => {
    const slow = deferred<PageModule>()
    const { router, writes, go } = setup('/', {
      '/slow': () => slow.promise,
      '/guide/intro': page(Intro),
    })

    const pending = router.push('/slow')
    go('/guide/intro')
    slow.resolve({ default: Routing })
    await pending

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/guide/intro')
    })
    expect(router.page.value).toBe(Intro)
    // Going back must not write a new history entry.
    expect(writes).toEqual([])
  })

  it('cancels a navigation when a guard returns false', async () => {
    const { router, writes } = setup('/guide/intro')
    router.beforeEach(() => false)

    await router.push('/guide/routing')

    expect(router.currentRoute.value.path).toBe('/guide/intro')
    expect(router.page.value).toBeNull()
    expect(writes).toEqual([])
  })

  it('cancels a navigation when a guard resolves to false', async () => {
    const { router, writes } = setup('/guide/intro')
    router.beforeEach(async () => false)

    await router.push('/guide/routing')

    expect(router.currentRoute.value.path).toBe('/guide/intro')
    expect(writes).toEqual([])
  })

  it('runs guards and hooks in registration order with both routes', async () => {
    const calls: string[] = []
    const { router } = setup('/guide/intro')
    router.beforeEach((to, from) => {
      calls.push(`before1 ${from.path} -> ${to.path}`)
    })
    router.beforeEach((to, from) => {
      calls.push(`before2 ${from.path} -> ${to.path}`)
    })
    router.afterEach((to, from) => {
      calls.push(`after ${from.path} -> ${to.path}`)
    })

    await router.push('/guide/routing')

    expect(calls).toEqual([
      'before1 /guide/intro -> /guide/routing',
      'before2 /guide/intro -> /guide/routing',
      'after /guide/intro -> /guide/routing',
    ])
  })

  it('stops running hooks once they are removed', async () => {
    const calls: string[] = []
    const { router } = setup('/guide/intro')
    const remove = router.beforeEach(() => {
      calls.push('guard')
    })
    remove()

    await router.push('/guide/routing')

    expect(calls).toEqual([])
  })

  it('follows the browser history without writing an entry', async () => {
    const { router, writes, go } = setup('/guide/intro')

    go('/guide/routing')

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/guide/routing')
    })
    expect(router.page.value).toBe(Routing)
    expect(writes).toEqual([])
  })

  it('enters a location without writing a history entry', async () => {
    const { router, writes } = setup('/guide/intro?from=nav')

    await router.enter('/guide/intro')

    expect(router.currentRoute.value.fullPath).toBe('/guide/intro')
    expect(router.page.value).toBe(Intro)
    expect(writes).toEqual([])
  })

  it('reports the page data the page module carries', async () => {
    // The page data of the current page is what a theme reads through usePageData().
    const withData = vi.fn(async () => ({
      default: Intro,
      __pageData: {
        path: '/guide/intro',
        title: 'Intro',
        frontmatter: {},
        headers: [],
      },
    }))
    const { router } = setup('/', { '/guide/intro': withData })

    await router.push('/guide/intro')

    const { getPageData } = await import('../page-data')
    expect(getPageData('/guide/intro')?.title).toBe('Intro')
    expect(router.page.value).toBe(Intro)
  })
})
