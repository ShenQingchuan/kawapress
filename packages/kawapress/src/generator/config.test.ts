import type { HeadConfig } from '../core/head'
import { describe, expect, it } from 'vitest'
import { resolveSiteConfig } from './config'

describe('resolveSiteConfig', () => {
  it('uses public as the default public directory', async () => {
    const config = await resolveSiteConfig({})

    expect(config.publicDir).toBe('public')
  })

  it('normalizes a configured public directory inside srcDir', async () => {
    const config = await resolveSiteConfig({
      publicDir: './site-assets/',
    })

    expect(config.publicDir).toBe('site-assets')
  })

  it.each(['', '.', '../site-assets', '/site-assets'])(
    'rejects an invalid public directory: %s',
    async (publicDir) => {
      await expect(resolveSiteConfig({ publicDir })).rejects.toThrow(
        'publicDir must be a relative directory inside srcDir',
      )
    },
  )
})

describe('head config', () => {
  it('defaults to no head tags', async () => {
    const config = await resolveSiteConfig({})

    expect(config.head).toEqual([])
    expect(config.locales.root.head).toBeUndefined()
  })

  it('keeps site and locale head tags', async () => {
    const config = await resolveSiteConfig({
      head: [['meta', { property: 'og:image', content: '/social.png' }]],
      locales: {
        root: { label: 'English' },
        en: {
          label: 'English',
          head: [['script', { src: 'https://example.com/a.js', defer: true }]],
        },
      },
    })

    expect(config.head).toEqual([
      ['meta', { property: 'og:image', content: '/social.png' }],
    ])
    expect(config.locales.en.head).toEqual([
      ['script', { src: 'https://example.com/a.js', defer: true }],
    ])
  })

  it('reports the config path of an invalid site head tag', async () => {
    await expect(resolveSiteConfig({
      head: [['title', {}]] as unknown as HeadConfig[],
    })).rejects.toThrow('invalid head config in the site config.\nhead[0][0] must be one of')
  })

  it('reports the config path of an invalid locale head attribute', async () => {
    await expect(resolveSiteConfig({
      locales: {
        en: {
          label: 'English',
          head: [['meta', { name: 'description', content: 42 }]] as unknown as HeadConfig[],
        },
      },
    })).rejects.toThrow('locales.en.head[0][1].content must be a string or boolean')
  })
})
