import type { Router, RouteRecordRaw } from 'vue-router'
import { pageData, pages } from 'virtual:kawapress-pages'
import { site } from 'virtual:kawapress-site'
import { defineComponent, h, resolveComponent } from 'vue'
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import { withoutBase } from '../base'
import { wrapPageLoader } from './page-data'

const NotFoundRoute = defineComponent({
  name: 'KawaNotFound',
  setup() {
    const NotFound = resolveComponent('NotFound')
    return () => h(NotFound)
  },
})

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
    installLinkInterceptor(router)
  }
  return router
}

const externalRE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i

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
    const routePath = withoutBase(url.pathname, site.base)
    if (!routePath) {
      return
    }

    event.preventDefault()
    router.push(`${routePath}${url.search}${url.hash}`)
  })
}
