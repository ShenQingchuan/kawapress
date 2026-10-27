import type { Component } from 'vue'
import { defineComponent, h } from 'vue'
import NotFoundRoute from '../components/NotFoundRoute.vue'
import { useAppRouter } from './injection'

/**
 * Renders the current page, or the not-found page for a route the page table
 * does not know. Nothing is rendered while the first page is still loading; the
 * app mounts only after that, so a reader never sees an empty frame.
 */
export default defineComponent({
  name: 'KawaRouterView',
  setup() {
    const router = useAppRouter()

    return (): ReturnType<typeof h> | null => {
      const route = router.currentRoute.value
      if (!route.found) {
        return h(NotFoundRoute)
      }
      const page: Component | null = router.page.value
      return page === null ? null : h(page)
    }
  },
})
