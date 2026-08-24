import type { NagiHomeImage } from './home'
import type { NagiSidebarConfig } from './sidebar'

export interface ResolvedNagiThemeConfig {
  sidebarMenuLabel: string
  outlineLabel: string
  returnToTopLabel: string
  langMenuLabel: string
  appearanceLabel: string
  previousPageLabel: string
  nextPageLabel: string
  logo?: NagiHomeImage
  githubUrl?: string
  sidebar?: NagiSidebarConfig
}

export type NagiThemeConfig = Partial<ResolvedNagiThemeConfig>

const EN_THEME_CONFIG: ResolvedNagiThemeConfig = {
  sidebarMenuLabel: 'Menu',
  outlineLabel: 'On this page',
  returnToTopLabel: 'Return to top',
  langMenuLabel: 'Change language',
  appearanceLabel: 'Toggle light and dark mode',
  previousPageLabel: 'Previous page',
  nextPageLabel: 'Next page',
}

const ZH_THEME_CONFIG: ResolvedNagiThemeConfig = {
  sidebarMenuLabel: '菜单',
  outlineLabel: '本页目录',
  returnToTopLabel: '返回顶部',
  langMenuLabel: '切换语言',
  appearanceLabel: '切换明暗模式',
  previousPageLabel: '上一篇',
  nextPageLabel: '下一篇',
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
    outlineLabel: config.outlineLabel ?? defaults.outlineLabel,
    returnToTopLabel: config.returnToTopLabel ?? defaults.returnToTopLabel,
    langMenuLabel: config.langMenuLabel ?? defaults.langMenuLabel,
    appearanceLabel: config.appearanceLabel ?? defaults.appearanceLabel,
    previousPageLabel: config.previousPageLabel ?? defaults.previousPageLabel,
    nextPageLabel: config.nextPageLabel ?? defaults.nextPageLabel,
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
