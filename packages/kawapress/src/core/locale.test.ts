import type { SiteData } from './site'
import { describe, expect, it } from 'vitest'
import {
  getLocaleIndex,
  resolveLocaleIndex,
  resolveLocaleLink,
  resolveSiteDataByPath,
} from './locale'

interface TestThemeConfig {
  menu?: string
  outline?: string
}

const site: SiteData<TestThemeConfig> = {
  title: 'KawaPress',
  base: '/kawapress/',
  head: [['meta', { name: 'theme-color', content: '#ffffff' }]],
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
      head: [['meta', { property: 'og:locale', content: 'zh_CN' }]],
      themeConfig: {
        menu: '菜单',
      },
    },
  },
}

describe('resolveLocaleIndex', () => {
  const localeKeys = ['root', 'en', 'zh', 'zh-hant']

  it('gives every other path to root', () => {
    expect(resolveLocaleIndex('/', localeKeys)).toBe('root')
    expect(resolveLocaleIndex('/guide/start', localeKeys)).toBe('root')
  })

  it('matches a locale prefix as a whole segment', () => {
    expect(resolveLocaleIndex('/en', localeKeys)).toBe('en')
    expect(resolveLocaleIndex('/en/', localeKeys)).toBe('en')
    expect(resolveLocaleIndex('/en/guide', localeKeys)).toBe('en')
    expect(resolveLocaleIndex('/english', localeKeys)).toBe('root')
    expect(resolveLocaleIndex('/english/guide', localeKeys)).toBe('root')
  })

  it('prefers the longest matching prefix', () => {
    expect(resolveLocaleIndex('/zh/guide', localeKeys)).toBe('zh')
    expect(resolveLocaleIndex('/zh-hant/guide', localeKeys)).toBe('zh-hant')
  })

  it('ignores query and hash when matching', () => {
    expect(resolveLocaleIndex('/en?tab=api', localeKeys)).toBe('en')
    expect(resolveLocaleIndex('/en/guide#setup', localeKeys)).toBe('en')
    expect(resolveLocaleIndex('/guide#en', localeKeys)).toBe('root')
  })

  it('only falls back to root when root is the only locale key', () => {
    expect(resolveLocaleIndex('/en/guide', ['root'])).toBe('root')
    expect(resolveLocaleIndex('/en/guide', [])).toBe('root')
  })
})

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
      link: '/kawapress/zh',
      themeConfig: {
        menu: '菜单',
        outline: 'Contents',
      },
    })
  })

  it('keeps site and locale head tags apart', () => {
    expect(resolveSiteDataByPath(site, '/zh/guide')).toMatchObject({
      head: [['meta', { name: 'theme-color', content: '#ffffff' }]],
      localeHead: [['meta', { property: 'og:locale', content: 'zh_CN' }]],
    })
    expect(resolveSiteDataByPath(site, '/guide')).toMatchObject({
      localeHead: [],
    })
  })

  it('keeps the relative page, query, and hash when changing locale', () => {
    expect(resolveLocaleLink(site, '/', 'zh')).toBe('/kawapress/zh')
    expect(resolveLocaleLink(site, '/zh', 'root')).toBe('/kawapress/')
    expect(resolveLocaleLink(site, '/guide/start?tab=api#setup', 'zh'))
      .toBe('/kawapress/zh/guide/start?tab=api#setup')
    expect(resolveLocaleLink(site, '/zh/guide/start?tab=api#setup', 'root'))
      .toBe('/kawapress/guide/start?tab=api#setup')
  })
})
