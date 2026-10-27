import { site } from 'virtual:kawapress-site'
import { computed, defineComponent, h, useAttrs } from 'vue'
import { withBase } from '../../core/base'
import { useAppRouter } from './injection'
import { isSamePagePath, routePathOf } from './route'

/**
 * A link to another page of the site, rendered as a plain `<a>` with the site
 * base applied. Clicks are handled by the global link interceptor, so a page
 * with a thousand sidebar links does no per-link work: the only thing this
 * component computes is whether it is the current page.
 */
export default defineComponent({
  name: 'KawaRouterLink',
  inheritAttrs: false,
  props: {
    /** Route path without the site base, for example `/guide/intro`. */
    to: { type: String, required: true },
  },
  setup(props, { slots }) {
    const router = useAppRouter()
    const attrs = useAttrs()
    const isCurrent = computed(() => isSamePagePath(
      router.currentRoute.value.path,
      routePathOf(props.to),
    ))

    return () => h('a', {
      ...attrs,
      'href': withBase(props.to, site.base),
      'aria-current': isCurrent.value ? 'page' : undefined,
    }, slots.default?.())
  },
})
