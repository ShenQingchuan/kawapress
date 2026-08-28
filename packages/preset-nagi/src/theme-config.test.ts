import { describe, expect, it } from 'vitest'
import { resolveNagiThemeConfig } from './theme-config'

describe('nagi theme translations', () => {
  it('provides built-in Chinese labels', () => {
    expect(resolveNagiThemeConfig({}, 'zh-CN')).toEqual({
      sidebarMenuLabel: '菜单',
      sidebarResizeLabel: '调整侧边栏宽度',
      navMenuLabel: '打开导航菜单',
      outlineLabel: '本页目录',
      outlineCollapseLabel: '收起本页目录',
      outlineExpandLabel: '展开本页目录',
      returnToTopLabel: '返回顶部',
      langMenuLabel: '切换语言',
      appearanceLabel: '切换明暗模式',
      previousPageLabel: '上一篇',
      nextPageLabel: '下一篇',
      notFoundMessage: '找不到页面',
      notFoundHomeLabel: '返回首页',
      footerLicenseText: '基于 MIT 许可发布',
      footerPoweredByText: 'KawaPress 强力驱动',
    })
  })

  it('falls back to English and keeps user overrides', () => {
    expect(resolveNagiThemeConfig({
      outlineLabel: 'Page contents',
      githubUrl: 'https://github.com/example/docs',
    }, 'fr'))
      .toEqual({
        sidebarMenuLabel: 'Menu',
        sidebarResizeLabel: 'Resize sidebar',
        navMenuLabel: 'Open navigation menu',
        outlineLabel: 'Page contents',
        outlineCollapseLabel: 'Collapse page outline',
        outlineExpandLabel: 'Expand page outline',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language',
        appearanceLabel: 'Toggle light and dark mode',
        previousPageLabel: 'Previous page',
        nextPageLabel: 'Next page',
        notFoundMessage: 'page not found',
        notFoundHomeLabel: 'back to home',
        footerLicenseText: 'Released under the MIT License',
        footerPoweredByText: 'Powered by KawaPress',
        githubUrl: 'https://github.com/example/docs',
      })
  })
})
