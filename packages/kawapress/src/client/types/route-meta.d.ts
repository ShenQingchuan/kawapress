import type { PageRouteMeta } from '../../core/site'

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * Route summary of a Markdown page. Present on every page route and absent
     * on the catch-all 404 route.
     */
    page?: PageRouteMeta
  }
}
