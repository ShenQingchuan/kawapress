export interface ResolvedNagiThemeConfig {
  sidebarMenuLabel: string
  outlineLabel: string
  returnToTopLabel: string
  langMenuLabel: string
}

export type NagiThemeConfig = Partial<ResolvedNagiThemeConfig>

const EN_THEME_CONFIG: ResolvedNagiThemeConfig = {
  sidebarMenuLabel: 'Menu',
  outlineLabel: 'On this page',
  returnToTopLabel: 'Return to top',
  langMenuLabel: 'Change language',
}

const ZH_THEME_CONFIG: ResolvedNagiThemeConfig = {
  sidebarMenuLabel: '菜单',
  outlineLabel: '本页目录',
  returnToTopLabel: '返回顶部',
  langMenuLabel: '切换语言',
}

export function resolveNagiThemeConfig(
  config: NagiThemeConfig = {},
  lang = 'en',
): ResolvedNagiThemeConfig {
  const defaults = lang.toLowerCase().startsWith('zh')
    ? ZH_THEME_CONFIG
    : EN_THEME_CONFIG

  return {
    sidebarMenuLabel: config.sidebarMenuLabel ?? defaults.sidebarMenuLabel,
    outlineLabel: config.outlineLabel ?? defaults.outlineLabel,
    returnToTopLabel: config.returnToTopLabel ?? defaults.returnToTopLabel,
    langMenuLabel: config.langMenuLabel ?? defaults.langMenuLabel,
  }
}
