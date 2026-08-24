import { describe, expect, it } from 'vitest'
import { resolveNagiThemeConfig } from './theme-config'

describe('nagi theme translations', () => {
  it('provides built-in Chinese labels', () => {
    expect(resolveNagiThemeConfig({}, 'zh-CN')).toEqual({
      sidebarMenuLabel: '菜单',
      outlineLabel: '本页目录',
      returnToTopLabel: '返回顶部',
      langMenuLabel: '切换语言',
    })
  })

  it('falls back to English and keeps user overrides', () => {
    expect(resolveNagiThemeConfig({ outlineLabel: 'Page contents' }, 'fr'))
      .toEqual({
        sidebarMenuLabel: 'Menu',
        outlineLabel: 'Page contents',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language',
      })
  })
})
