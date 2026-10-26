import type { RouteRecordRaw } from 'vue-router'
import type { PageManifest } from '../core/page-manifest'
import { NOT_FOUND_ROUTE_NAME } from '../core/not-found'
import { toPageRouteMeta } from '../core/page-manifest'
import NotFoundRoute from './components/NotFoundRoute.vue'
import { wrapPageLoader } from './page-data'

/**
 * Route records of every page in the manifest, plus the not-found fallback. The
 * manifest is keyed by route path and stores the route summary without it, so
 * the path is filled into `route.meta.page` here.
 */
export function createRoutes(pageManifest: PageManifest): RouteRecordRaw[] {
  return [
    ...Object.entries(pageManifest).map(([path, page]) => ({
      path,
      component: wrapPageLoader(path, page.load),
      meta: { page: toPageRouteMeta(path, page) },
    })),
    { path: '/:pathMatch(.*)*', name: NOT_FOUND_ROUTE_NAME, component: NotFoundRoute },
  ]
}
