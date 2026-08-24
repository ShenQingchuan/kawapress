import type { ComputedRef } from 'vue'
import type { NagiThemeConfig, ResolvedNagiThemeConfig } from '../theme-config'
import { useLocale, useThemeConfig } from 'kawapress/client'
import { computed } from 'vue'
import { resolveNagiThemeConfig } from '../theme-config'

export function useNagiThemeConfig(): ComputedRef<ResolvedNagiThemeConfig> {
  const themeConfig = useThemeConfig<NagiThemeConfig>()
  const { locale } = useLocale()
  return computed(() => resolveNagiThemeConfig(
    themeConfig.value,
    locale.value?.lang,
  ))
}
