import { describe, expect, it } from 'vitest'
import { collectDevCssUrls } from './request-handler'

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
