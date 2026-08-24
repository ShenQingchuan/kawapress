import { describe, expect, it } from 'vitest'
import { resolveNagiThemeConfig } from './theme-config'

describe('nagi theme translations', () => {
  it('provides built-in Chinese labels', () => {
    expect(resolveNagiThemeConfig({}, 'zh-CN')).toEqual({
      sidebarMenuLabel: '菜单',
      navMenuLabel: '打开导航菜单',
      outlineLabel: '本页目录',
      returnToTopLabel: '返回顶部',
      langMenuLabel: '切换语言',
      appearanceLabel: '切换明暗模式',
      previousPageLabel: '上一篇',
      nextPageLabel: '下一篇',
    })
  })

  it('falls back to English and keeps user overrides', () => {
    expect(resolveNagiThemeConfig({
      outlineLabel: 'Page contents',
      githubUrl: 'https://github.com/example/docs',
    }, 'fr'))
      .toEqual({
        sidebarMenuLabel: 'Menu',
        navMenuLabel: 'Open navigation menu',
        outlineLabel: 'Page contents',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language',
        appearanceLabel: 'Toggle light and dark mode',
        previousPageLabel: 'Previous page',
        nextPageLabel: 'Next page',
        githubUrl: 'https://github.com/example/docs',
      })
  })
})
