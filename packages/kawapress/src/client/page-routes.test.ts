import type { PageManifest } from '../core/page-manifest'
import { describe, expect, it } from 'vitest'
import { createRoutes } from './page-routes'

const component = { name: 'Page' }

function manifest(): PageManifest {
  return {
    '/guide/intro': {
      title: 'Intro',
      load: async () => ({ default: component }),
    },
    '/': {
      title: 'Home',
      layout: 'home',
      load: async () => ({ default: component }),
    },
  }
}

describe('createRoutes', () => {
  it('fills the route path into route.meta.page', () => {
    const routes = createRoutes(manifest())

    expect(routes[0]?.path).toBe('/guide/intro')
    expect(routes[0]?.meta).toEqual({
      page: { path: '/guide/intro', title: 'Intro' },
    })
    expect(routes[1]?.meta).toEqual({
      page: { path: '/', title: 'Home', layout: 'home' },
    })
  })

  it('loads the page component through the loader of its record', async () => {
    const routes = createRoutes(manifest())
    const load = routes[0]?.component as () => Promise<unknown>

    expect(await load()).toBe(component)
  })

  it('adds the not-found fallback as the last route', () => {
    const routes = createRoutes(manifest())

    expect(routes).toHaveLength(3)
    expect(routes[2]?.path).toBe('/:pathMatch(.*)*')
    expect(routes[2]?.name).toBe('not-found')
  })

  it('builds the fallback route for a site without pages', () => {
    expect(createRoutes({}).map(route => route.path)).toEqual(['/:pathMatch(.*)*'])
  })
})
