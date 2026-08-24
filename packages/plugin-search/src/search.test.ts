import { describe, expect, it } from 'vitest'
import { createSearchExcerpt, highlightSearchText } from './search-highlight'
import { resolveSearchTranslations } from './translations'

describe('search runtime helpers', () => {
  it('highlights plain text without injecting HTML', () => {
    expect(highlightSearchText('Use KawaPress (today)', 'KawaPress (today)'))
      .toEqual([
        { text: 'Use ', highlighted: false },
        { text: 'KawaPress', highlighted: true },
        { text: ' ', highlighted: false },
        { text: '(today)', highlighted: true },
      ])
  })

  it('centers long excerpts near the search term', () => {
    const text = `${'before '.repeat(30)}important result${' after'.repeat(30)}`
    const excerpt = createSearchExcerpt(text, 'important', 80)

    expect(excerpt).toContain('important')
    expect(excerpt.startsWith('…')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
  })

  it('provides Chinese translations and accepts host overrides', () => {
    expect(resolveSearchTranslations({ buttonLabel: '查找' }, 'zh-CN'))
      .toMatchObject({
        buttonLabel: '查找',
        placeholder: '搜索文档',
        noResultsLabel: '未找到相关内容',
      })
    expect(resolveSearchTranslations({}, 'fr').buttonLabel).toBe('Search')
  })
})
