import type { ComputedRef } from 'vue'
import type { PageData, ThemeConfig } from '../core/extension-points'
import type { LocaleLink, ResolvedSiteData, SiteData } from '../core/site'
import { site } from 'virtual:kawapress-site'
import { computed } from 'vue'
import { getLocaleIndex, resolveLocaleLinks, resolveSiteDataByPath } from '../core/locale'
import { getPageData } from './page-data'
import { useRoute } from './router/injection'

export interface LocaleContext {
  localeIndex: ComputedRef<string>
  locale: ComputedRef<LocaleLink | undefined>
  locales: ComputedRef<LocaleLink[]>
  localeLinks: ComputedRef<LocaleLink[]>
}

export function useSite(): ComputedRef<ResolvedSiteData> {
  const route = useRoute()
  return computed(() => resolveSiteDataByPath(
    site as SiteData,
    route.value.path,
  ))
}

export function useThemeConfig(): ComputedRef<Partial<ThemeConfig>> {
  const resolvedSite = useSite()
  return computed(() => resolvedSite.value.themeConfig)
}

export function useLocale(): LocaleContext {
  const route = useRoute()
  const localeIndex = computed(() => getLocaleIndex(site, route.value.path))
  const locales = computed(() => resolveLocaleLinks(site, route.value.fullPath))
  const locale = computed(() => locales.value.find(
    item => item.localeIndex === localeIndex.value,
  ))
  const localeLinks = computed(() => locales.value.filter(
    item => item.localeIndex !== localeIndex.value,
  ))

  return {
    localeIndex,
    locale,
    locales,
    localeLinks,
  }
}

export function usePageData(): ComputedRef<PageData | undefined> {
  const route = useRoute()
  return computed(() => getPageData(route.value.path))
}
