import type { NagiHomeImage } from './home'
import type { NagiSidebarConfig } from './sidebar'

export interface ResolvedNagiThemeConfig {
  sidebarMenuLabel: string
  navMenuLabel: string
  outlineLabel: string
  outlineCollapseLabel: string
  outlineExpandLabel: string
  returnToTopLabel: string
  langMenuLabel: string
  appearanceLabel: string
  previousPageLabel: string
  nextPageLabel: string
  footerLicenseText: string
  footerPoweredByText: string
  logo?: NagiHomeImage
  githubUrl?: string
  sidebar?: NagiSidebarConfig
}

export type NagiThemeConfig = Partial<ResolvedNagiThemeConfig>

const EN_THEME_CONFIG: ResolvedNagiThemeConfig = {
  sidebarMenuLabel: 'Menu',
  navMenuLabel: 'Open navigation menu',
  outlineLabel: 'On this page',
  outlineCollapseLabel: 'Collapse page outline',
  outlineExpandLabel: 'Expand page outline',
  returnToTopLabel: 'Return to top',
  langMenuLabel: 'Change language',
  appearanceLabel: 'Toggle light and dark mode',
  previousPageLabel: 'Previous page',
  nextPageLabel: 'Next page',
  footerLicenseText: 'Released under the MIT License',
  footerPoweredByText: 'Powered by KawaPress',
}

const ZH_THEME_CONFIG: ResolvedNagiThemeConfig = {
  sidebarMenuLabel: '菜单',
  navMenuLabel: '打开导航菜单',
  outlineLabel: '本页目录',
  outlineCollapseLabel: '收起本页目录',
  outlineExpandLabel: '展开本页目录',
  returnToTopLabel: '返回顶部',
  langMenuLabel: '切换语言',
  appearanceLabel: '切换明暗模式',
  previousPageLabel: '上一篇',
  nextPageLabel: '下一篇',
  footerLicenseText: '基于 MIT 许可发布',
  footerPoweredByText: 'KawaPress 强力驱动',
}

export function resolveNagiThemeConfig(
  config: NagiThemeConfig = {},
  lang = 'en',
): ResolvedNagiThemeConfig {
  const defaults = lang.toLowerCase().startsWith('zh')
    ? ZH_THEME_CONFIG
    : EN_THEME_CONFIG

  const resolved: ResolvedNagiThemeConfig = {
    sidebarMenuLabel: config.sidebarMenuLabel ?? defaults.sidebarMenuLabel,
    navMenuLabel: config.navMenuLabel ?? defaults.navMenuLabel,
    outlineLabel: config.outlineLabel ?? defaults.outlineLabel,
    outlineCollapseLabel: config.outlineCollapseLabel ?? defaults.outlineCollapseLabel,
    outlineExpandLabel: config.outlineExpandLabel ?? defaults.outlineExpandLabel,
    returnToTopLabel: config.returnToTopLabel ?? defaults.returnToTopLabel,
    langMenuLabel: config.langMenuLabel ?? defaults.langMenuLabel,
    appearanceLabel: config.appearanceLabel ?? defaults.appearanceLabel,
    previousPageLabel: config.previousPageLabel ?? defaults.previousPageLabel,
    nextPageLabel: config.nextPageLabel ?? defaults.nextPageLabel,
    footerLicenseText: config.footerLicenseText ?? defaults.footerLicenseText,
    footerPoweredByText: config.footerPoweredByText ?? defaults.footerPoweredByText,
  }
  if (config.logo !== undefined) {
    resolved.logo = config.logo
  }
  if (config.githubUrl !== undefined) {
    resolved.githubUrl = config.githubUrl
  }
  if (config.sidebar !== undefined) {
    resolved.sidebar = config.sidebar
  }
  return resolved
}
