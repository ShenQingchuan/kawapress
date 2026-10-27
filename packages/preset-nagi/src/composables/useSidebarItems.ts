import type { ComputedRef } from 'vue'
import type { NagiSidebarItem, SidebarPages } from '../sidebar'
import { resolveLocaleIndex, useLocale, useRouter } from 'kawapress/client'
import { sidebarMeta, sidebarPages } from 'virtual:kawapress-nagi-sidebar-meta'
import { computed } from 'vue'
import { createSidebar, resolveConfiguredSidebar } from '../sidebar'
import { useNagiThemeConfig } from './useNagiThemeConfig'

export function useSidebarItems(): ComputedRef<NagiSidebarItem[]> {
  const router = useRouter()
  const theme = useNagiThemeConfig()
  const { localeIndex, locales } = useLocale()

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

    return createSidebar(localeOf(sidebarPages, currentLocale, localeKeys), {
      base: currentPrefix,
      meta: sidebarMeta,
    })
  })
}

/** Pages of one locale, which share a sidebar scope. */
function localeOf(
  pages: SidebarPages,
  locale: string,
  localeKeys: readonly string[],
): SidebarPages {
  return Object.fromEntries(
    Object.entries(pages).filter(([path]) => (
      resolveLocaleIndex(path, localeKeys) === locale
    )),
  )
}
