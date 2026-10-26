import { describe, expect, it } from 'vitest'
import { resolveCommentsLabels } from './translations'

describe('comments labels', () => {
  it('follows the locale language by default', () => {
    expect(resolveCommentsLabels(emptyOverrides(), 'root', 'en')).toEqual({
      heading: 'Comments',
    })
    expect(resolveCommentsLabels(emptyOverrides(), 'root', 'zh-CN')).toEqual({
      heading: '评论',
    })
  })

  it('falls back to English when the locale has no language', () => {
    expect(resolveCommentsLabels(emptyOverrides(), 'root', undefined)).toEqual({
      heading: 'Comments',
    })
  })

  it('applies site-wide labels and then the override of the current locale', () => {
    const options = {
      labels: { heading: 'Discussion' },
      localeLabels: {
        en: { heading: 'Talk' },
        root: { heading: '讨论' },
      },
    }

    expect(resolveCommentsLabels(options, 'en', 'en')).toEqual({ heading: 'Talk' })
    expect(resolveCommentsLabels(options, 'root', 'zh-CN')).toEqual({ heading: '讨论' })
    expect(resolveCommentsLabels(options, 'ja', 'ja')).toEqual({ heading: 'Discussion' })
  })

  it('keeps the built-in heading when only some labels are overridden', () => {
    expect(resolveCommentsLabels({ labels: {}, localeLabels: {} }, 'root', 'zh-CN'))
      .toEqual({ heading: '评论' })
  })
})

function emptyOverrides() {
  return { labels: {}, localeLabels: {} }
}
