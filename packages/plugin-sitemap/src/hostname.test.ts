import { describe, expect, it } from 'vitest'
import { resolveSitemapHostname } from './hostname'

describe('resolveSitemapHostname', () => {
  it('keeps the origin and adds a trailing slash at the root base', () => {
    expect(resolveSitemapHostname('https://kawapress.dev', '/')).toBe('https://kawapress.dev/')
  })

  it('appends the site base when the hostname only contains the origin', () => {
    expect(resolveSitemapHostname('https://example.com', '/my-site/')).toBe('https://example.com/my-site/')
  })

  it('does not append the base twice when the hostname already includes it', () => {
    expect(resolveSitemapHostname('https://example.com/my-site/', '/my-site/')).toBe('https://example.com/my-site/')
    expect(resolveSitemapHostname('https://example.com/my-site', '/my-site/')).toBe('https://example.com/my-site/')
  })

  it('drops query and hash from the hostname', () => {
    expect(resolveSitemapHostname('https://example.com/?a=1#top', '/')).toBe('https://example.com/')
  })

  it('rejects non-http protocols', () => {
    expect(() => resolveSitemapHostname('ftp://example.com', '/')).toThrow('hostname must use http or https')
  })
})
