import type { Router, RouteRecordRaw } from 'vue-router'
import { pageData, pages } from 'virtual:kawapress-pages'
import { site } from 'virtual:kawapress-site'
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import { decodeUrlPathname, withoutBase } from '../base'
import NotFoundRoute from './NotFoundRoute.vue'
import { wrapPageLoader } from './page-data'

export function createRoutes(): RouteRecordRaw[] {
  return [
    ...Object.entries(pages).map(([path, loader]) => ({
      path,
      component: wrapPageLoader(path, loader),
      meta: { pageData: pageData[path] },
    })),
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundRoute },
  ]
}

export function createAppRouter(): Router {
  const router = createRouter({
    history: import.meta.env.SSR
      ? createMemoryHistory(site.base)
      : createWebHistory(site.base),
    routes: createRoutes(),
  })
  if (!import.meta.env.SSR) {
    installEncodedPagePathRedirect(router)
    installLinkInterceptor(router)
  }
  return router
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
    if (router.resolve(target).name === 'not-found') {
      return
    }

    event.preventDefault()
    router.push(target)
  })
}
