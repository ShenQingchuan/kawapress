import type { PageData } from 'kawapress'
import type { ComputedRef } from 'vue'
import type { NagiSidebarItem } from '../sidebar'
import { useLocale, useRouter } from 'kawapress/client'
import { sidebarMeta } from 'virtual:kawapress-nagi-sidebar-meta'
import { computed } from 'vue'
import { createSidebar, resolveConfiguredSidebar } from '../sidebar'
import { useNagiThemeConfig } from './useNagiThemeConfig'

export function useSidebarItems(): ComputedRef<NagiSidebarItem[]> {
  const router = useRouter()
  const theme = useNagiThemeConfig()
  const { localeIndex, locales } = useLocale()
  const pages: Record<string, PageData> = {}

  for (const route of router.getRoutes()) {
    const pageData = route.meta.pageData as PageData | undefined
    if (pageData) {
      pages[pageData.path] = pageData
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
    const localePrefixes = locales.value
      .map(locale => locale.localeIndex)
      .filter(locale => locale !== 'root')
      .map(locale => `/${locale}`)
    const currentPrefix = currentLocale === 'root' ? '' : `/${currentLocale}`
    const localePages = Object.fromEntries(
      Object.entries(pages).filter(([path]) => {
        if (currentLocale === 'root') {
          return !localePrefixes.some(
            prefix => path === prefix || path.startsWith(`${prefix}/`),
          )
        }
        return path === currentPrefix || path.startsWith(`${currentPrefix}/`)
      }),
    )

    return createSidebar(localePages, {
      base: currentPrefix,
      meta: sidebarMeta,
    })
  })
}
