import type { ComputedRef } from 'vue'
import type { LocaleLink, PageData, ResolvedSiteData, SiteData } from '../site'
import { site } from 'virtual:kawapress-site'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getLocaleIndex, resolveLocaleLinks, resolveSiteDataByPath } from '../locale'
import { getPageData } from './page-data'

export interface LocaleContext {
  localeIndex: ComputedRef<string>
  locale: ComputedRef<LocaleLink | undefined>
  locales: ComputedRef<LocaleLink[]>
  localeLinks: ComputedRef<LocaleLink[]>
}

export function useSite<ThemeConfig extends object = object>(): ComputedRef<ResolvedSiteData<ThemeConfig>> {
  const route = useRoute()
  return computed(() => resolveSiteDataByPath(
    site as SiteData<ThemeConfig>,
    route.path,
  ))
}

export function useThemeConfig<ThemeConfig extends object = object>(): ComputedRef<ThemeConfig> {
  const resolvedSite = useSite<ThemeConfig>()
  return computed(() => resolvedSite.value.themeConfig)
}

export function useLocale(): LocaleContext {
  const route = useRoute()
  const localeIndex = computed(() => getLocaleIndex(site, route.path))
  const locales = computed(() => resolveLocaleLinks(site, route.fullPath))
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
  return computed(() => getPageData(route.path))
}
