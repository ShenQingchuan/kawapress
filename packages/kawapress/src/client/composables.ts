import type { ComputedRef } from 'vue'
import type { PageData, SiteData } from '../site'
import { site } from 'virtual:kawapress-site'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getPageData } from './page-data'

export function useSite(): SiteData {
  return site
}

export function usePage(): ComputedRef<PageData | undefined> {
  const route = useRoute()
  return computed(() => getPageData(route.path))
}
