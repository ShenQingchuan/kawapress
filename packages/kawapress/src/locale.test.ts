import type { SiteData } from './site'
import { describe, expect, it } from 'vitest'
import { getLocaleIndex, resolveLocaleLink, resolveSiteDataByPath } from './locale'

interface TestThemeConfig {
  menu?: string
  outline?: string
}

const site: SiteData<TestThemeConfig> = {
  title: 'KawaPress',
  themeConfig: {
    menu: 'Menu',
    outline: 'Contents',
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'KawaPress 中文',
      themeConfig: {
        menu: '菜单',
      },
    },
  },
}

describe('locale routing', () => {
  it('resolves locales from whole URL path segments', () => {
    expect(getLocaleIndex(site, '/guide')).toBe('root')
    expect(getLocaleIndex(site, '/zh/guide')).toBe('zh')
    expect(getLocaleIndex(site, '/zh')).toBe('zh')
    expect(getLocaleIndex(site, '/zhongwen')).toBe('root')
  })

  it('shallowly merges locale site and theme data', () => {
    expect(resolveSiteDataByPath(site, '/zh/guide')).toMatchObject({
      localeIndex: 'zh',
      lang: 'zh-CN',
      title: 'KawaPress 中文',
      themeConfig: {
        menu: '菜单',
        outline: 'Contents',
      },
    })
  })

  it('keeps the relative page, query, and hash when changing locale', () => {
    expect(resolveLocaleLink(site, '/', 'zh')).toBe('/zh')
    expect(resolveLocaleLink(site, '/zh', 'root')).toBe('/')
    expect(resolveLocaleLink(site, '/guide/start?tab=api#setup', 'zh'))
      .toBe('/zh/guide/start?tab=api#setup')
    expect(resolveLocaleLink(site, '/zh/guide/start?tab=api#setup', 'root'))
      .toBe('/guide/start?tab=api#setup')
  })
})
