import { describe, expect, it } from 'vitest'
import { resolveLastUpdatedTexts } from './labels'

describe('last updated texts', () => {
  it('uses the built-in text of the page language', () => {
    expect(resolveLastUpdatedTexts({ lang: 'zh-CN' })).toEqual({
      lastUpdated: '最后更新于：',
      editLink: '编辑此页',
    })
    expect(resolveLastUpdatedTexts({ lang: 'en' })).toEqual({
      lastUpdated: 'Last updated: ',
      editLink: 'Edit this page',
    })
  })

  it('falls back to English without a language', () => {
    expect(resolveLastUpdatedTexts().lastUpdated).toBe('Last updated: ')
  })

  it('prefers the locale override, then the global one', () => {
    const texts = resolveLastUpdatedTexts({
      lang: 'en',
      localeIndex: 'en',
      labels: { lastUpdated: 'Updated', editLink: 'Edit' },
      localeLabels: { en: { lastUpdated: 'Touched' }, root: { lastUpdated: 'Root' } },
    })

    expect(texts).toEqual({
      lastUpdated: 'Touched: ',
      editLink: 'Edit',
    })
    expect(resolveLastUpdatedTexts({
      lang: 'en',
      localeIndex: 'root',
      labels: { lastUpdated: 'Updated' },
      localeLabels: { en: { lastUpdated: 'Touched' } },
    }).lastUpdated).toBe('Updated: ')
  })

  it('keeps the punctuation of the language when a label is overridden', () => {
    expect(resolveLastUpdatedTexts({
      lang: 'zh-CN',
      labels: { lastUpdated: '更新于' },
    }).lastUpdated).toBe('更新于：')
  })
})
