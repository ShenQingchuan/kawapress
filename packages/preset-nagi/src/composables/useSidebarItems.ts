import type { PageRouteMeta } from 'kawapress'
import type { ComputedRef } from 'vue'
import type { NagiSidebarItem } from '../sidebar'
import { resolveLocaleIndex, useLocale, useRouter } from 'kawapress/client'
import { sidebarMeta } from 'virtual:kawapress-nagi-sidebar-meta'
import { computed } from 'vue'
import { createSidebar, resolveConfiguredSidebar } from '../sidebar'
import { useNagiThemeConfig } from './useNagiThemeConfig'

export function useSidebarItems(): ComputedRef<NagiSidebarItem[]> {
  const router = useRouter()
  const theme = useNagiThemeConfig()
  const { localeIndex, locales } = useLocale()
  const pages: Record<string, PageRouteMeta> = {}

  for (const route of router.getRoutes()) {
    const page = route.meta.page
    if (page) {
      pages[page.path] = page
    }
  }

  return computed(() => {
    const configured = resolveConfiguredSidebar(
      theme.value.sidebar,
      router.currentRoute.value.path,
    )
    if (configured !== undefined) {
      return configured
    }

    const currentLocale = localeIndex.value
    const localeKeys = locales.value.map(locale => locale.localeIndex)
    const currentPrefix = currentLocale === 'root' ? '' : `/${currentLocale}`
    const localePages = Object.fromEntries(
      Object.entries(pages).filter(([path]) => (
        resolveLocaleIndex(path, localeKeys) === currentLocale
      )),
    )

    return createSidebar(localePages, {
      base: currentPrefix,
      meta: sidebarMeta,
    })
  })
}
