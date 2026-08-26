import { describe, expect, it } from 'vitest'
import { decodeUrlPathname, withBase } from './base'

describe('withBase', () => {
  it('always prefixes logical internal paths even when they resemble the base', () => {
    expect(withBase('/guide', '/docs/')).toBe('/docs/guide')
    expect(withBase('/docs/api', '/docs/')).toBe('/docs/docs/api')
    expect(withBase('assets/logo.svg', '/docs/')).toBe('/docs/assets/logo.svg')
  })

  it('does not prefix external URLs or same-page hashes', () => {
    expect(withBase('https://example.com/docs', '/docs/'))
      .toBe('https://example.com/docs')
    expect(withBase('#installation', '/docs/')).toBe('#installation')
  })
})

describe('decodeUrlPathname', () => {
  it('decodes route characters while preserving encoded URL delimiters', () => {
    expect(decodeUrlPathname('/%E6%8C%87%E5%8D%97%20%E7%A9%BA%E9%97%B4/page'))
      .toBe('/指南 空间/page')
    expect(decodeUrlPathname('/guide%23draft/page%3Fmode'))
      .toBe('/guide%23draft/page%3Fmode')
  })

  it('keeps malformed URL escapes available for normal 404 handling', () => {
    expect(decodeUrlPathname('/guide/%broken')).toBe('/guide/%broken')
  })
})
