import type { Router, RouteRecordRaw } from 'vue-router'
import { pageData, pages } from 'virtual:kawapress-pages'
import { site } from 'virtual:kawapress-site'
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import { decodeUrlPathname, withoutBase } from '../core/base'
import { NOT_FOUND_ROUTE_NAME } from '../core/not-found'
import NotFoundRoute from './components/NotFoundRoute.vue'
import { createClientHydration } from './hydration'
import { wrapPageLoader } from './page-data'

export interface AppRouter {
  router: Router
  /**
   * Points the router at the URL in the address bar once the client is
   * hydrated. A no-op on the server and whenever the client could hydrate the
   * requested URL directly.
   */
  adoptRequestedUrl: () => Promise<void>
}

export function createRoutes(): RouteRecordRaw[] {
  return [
    ...Object.entries(pages).map(([path, loader]) => ({
      path,
      component: wrapPageLoader(path, loader),
      meta: { pageData: pageData[path] },
    })),
    { path: '/:pathMatch(.*)*', name: NOT_FOUND_ROUTE_NAME, component: NotFoundRoute },
  ]
}

export function createAppRouter(): AppRouter {
  if (import.meta.env.SSR) {
    const router = createRouter({
      history: createMemoryHistory(site.base),
      routes: createRoutes(),
    })
    return { router, adoptRequestedUrl: () => Promise.resolve() }
  }

  // The browser history has to know the router before the router exists: it
  // resolves the hydration plan when the router reads its location.
  let createdRouter: Router | undefined
  const hydration = createClientHydration(createWebHistory(site.base), () => createdRouter)
  const router = createRouter({
    history: hydration.history,
    routes: createRoutes(),
  })
  createdRouter = router
  installEncodedPagePathRedirect(router)
  installLinkInterceptor(router)
  return { router, adoptRequestedUrl: hydration.adoptRequestedUrl }
}

const externalRE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i

function installEncodedPagePathRedirect(router: Router): void {
  router.beforeEach((to) => {
    const decodedPath = decodeUrlPathname(to.path)
    if (decodedPath !== to.path && Object.hasOwn(pages, decodedPath)) {
      return {
        path: decodedPath,
        query: to.query,
        hash: to.hash,
        replace: true,
      }
    }
  })
}

function installLinkInterceptor(router: Router): void {
  window.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    const anchor = (event.target as Element).closest('a')
    if (!anchor || anchor.target || anchor.hasAttribute('download')) {
      return
    }
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || externalRE.test(href)) {
      return
    }

    const url = new URL(anchor.href)
    if (url.origin !== window.location.origin) {
      return
    }
    const routePath = withoutBase(decodeUrlPathname(url.pathname), site.base)
    if (!routePath) {
      return
    }

    const target = `${routePath}${url.search}${url.hash}`
    if (router.resolve(target).name === NOT_FOUND_ROUTE_NAME) {
      return
    }

    event.preventDefault()
    router.push(target)
  })
}
