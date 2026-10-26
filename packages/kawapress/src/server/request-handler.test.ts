import { describe, expect, it } from 'vitest'
import { collectDevCssUrls, resolveRequestPathname } from './request-handler'

describe('collectDevCssUrls', () => {
  it('keeps blocking styles and ignores CSS imported as a value', () => {
    const modules = [
      { url: '/theme.css' },
      { url: '/Layout.vue?vue&type=style&index=0&lang.css' },
      { url: '/Page.vue?vue&type=style&index=0&lang.scss' },
      { url: '/tokens.css?inline' },
      { url: '/logo.css?url' },
      { url: '/entry-client.ts' },
    ]

    expect(collectDevCssUrls(modules)).toEqual([
      '/theme.css',
      '/Layout.vue?vue&type=style&index=0&lang.css',
      '/Page.vue?vue&type=style&index=0&lang.scss',
    ])
  })
})

describe('resolveRequestPathname', () => {
  it('routes from the address the browser asked for when Vite stripped the base', () => {
    expect(resolveRequestPathname({
      url: '/guide/intro?x=1',
      originalUrl: '/docs/guide/intro?x=1',
    })).toBe('/docs/guide/intro')
  })

  it('falls back to the request URL without a base middleware', () => {
    expect(resolveRequestPathname({ url: '/guide/intro#top' })).toBe('/guide/intro')
    expect(resolveRequestPathname({})).toBe('/')
  })
})
