import { describe, expect, it } from 'vitest'
import { createDateFormatter, formatLastUpdatedDate, resolveFormatOptions } from './format'

const VALUE = Date.parse('2024-05-06T23:30:00Z')

describe('date formatting', () => {
  it('uses a medium date and a short time by default', () => {
    const expected = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(VALUE)

    expect(formatLastUpdatedDate(VALUE, 'en', undefined, 'UTC')).toBe(expected)
  })

  it('uses the visitor time zone when no zone is given', () => {
    const local = new Intl.DateTimeFormat().resolvedOptions().timeZone
    const expected = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: local,
    }).format(VALUE)

    expect(formatLastUpdatedDate(VALUE, 'en')).toBe(expected)
  })

  it('replaces the date and time styles when the options set their own', () => {
    expect(resolveFormatOptions({ dateStyle: 'full' })).toEqual({
      dateStyle: 'full',
      timeStyle: 'short',
    })
  })

  it('drops date and time styles when the options describe fields', () => {
    const options = resolveFormatOptions({ year: 'numeric', month: 'long' })
    expect(options.dateStyle).toBeUndefined()
    expect(options.timeStyle).toBeUndefined()
    expect(createDateFormatter('zh', options, 'UTC').format(VALUE)).toContain('2024')
  })

  it('keeps an explicit zone', () => {
    const utc = formatLastUpdatedDate(VALUE, 'en', { timeZone: 'UTC' })
    const tokyo = formatLastUpdatedDate(
      VALUE,
      'en',
      { timeZone: 'Asia/Tokyo' },
    )

    expect(utc).not.toBe(tokyo)
  })

  it('reports an unusable locale with the setting that fixes it', () => {
    expect(() => formatLastUpdatedDate(VALUE, 'not a lang')).toThrow(
      /KawaPress Last Updated.*locales.*lastUpdated\.formatOptions/s,
    )
  })
})
