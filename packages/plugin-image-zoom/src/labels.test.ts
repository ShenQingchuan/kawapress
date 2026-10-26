import { describe, expect, it } from 'vitest'
import { createImageZoomLabelResolver, formatImageZoomLabel } from './labels'
import { resolveLocaleLanguages } from './locale'

describe('image zoom labels', () => {
  it('picks built-in labels from the locale language', () => {
    const resolveLabels = createImageZoomLabelResolver({
      localeLanguages: { en: 'en', root: 'zh-CN', ja: 'ja' },
    })

    expect(resolveLabels('/')).toEqual({ dialog: '图片缩放', zoom: '放大图片：{alt}' })
    expect(resolveLabels('/en/guide')).toEqual({ dialog: 'Image zoom', zoom: 'Zoom image: {alt}' })
    // A language without built-in labels falls back to English.
    expect(resolveLabels('/ja/guide')).toEqual({ dialog: 'Image zoom', zoom: 'Zoom image: {alt}' })
    expect(resolveLabels('/guide')).toEqual({ dialog: '图片缩放', zoom: '放大图片：{alt}' })
  })

  it('applies shared overrides before per-locale overrides', () => {
    const resolveLabels = createImageZoomLabelResolver({
      labels: { dialog: 'Enlarged image', zoom: 'Open {alt}' },
      localeLabels: { en: { dialog: 'Zoomed image' } },
      localeLanguages: { root: 'zh-CN', en: 'en' },
    })

    expect(resolveLabels('/guide')).toEqual({ dialog: 'Enlarged image', zoom: 'Open {alt}' })
    expect(resolveLabels('/en/guide')).toEqual({ dialog: 'Zoomed image', zoom: 'Open {alt}' })
  })

  it('fills the alt placeholder and drops the separator without alt text', () => {
    expect(formatImageZoomLabel('Zoom image: {alt}', 'Diagram')).toBe('Zoom image: Diagram')
    expect(formatImageZoomLabel('放大图片：{alt}', '架构图')).toBe('放大图片：架构图')
    expect(formatImageZoomLabel('Zoom image: {alt}', '  ')).toBe('Zoom image')
    expect(formatImageZoomLabel('放大图片：{alt}', '')).toBe('放大图片')
    // Alt text is inserted literally, never read as a replacement pattern.
    expect(formatImageZoomLabel('Zoom image: {alt}', 'Cost $& more')).toBe('Zoom image: Cost $& more')
  })
})

describe('image zoom locale languages', () => {
  it('reads the language of every locale key from the site config', () => {
    expect(resolveLocaleLanguages({
      root: { label: '简体中文', lang: 'zh-CN' },
      en: { label: 'English' },
    })).toEqual({ root: 'zh-CN', en: undefined })
    expect(resolveLocaleLanguages(undefined)).toEqual({})
  })
})
