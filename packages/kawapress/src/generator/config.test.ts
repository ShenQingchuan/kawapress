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

describe('resolveSiteConfig deadLinks', () => {
  it('checks dead links as errors by default', async () => {
    const config = await resolveSiteConfig({})

    expect(config.deadLinks).toEqual({ level: 'error', ignore: [] })
  })

  it('keeps warnings and ignore patterns', async () => {
    const ignore = [/^\/legacy/, 'https://example.com']
    const config = await resolveSiteConfig({
      deadLinks: {
        level: 'warn',
        ignore,
      },
    })

    expect(config.deadLinks).toEqual({ level: 'warn', ignore })
  })

  it('disables the check with false', async () => {
    const config = await resolveSiteConfig({ deadLinks: false })

    expect(config.deadLinks).toBe(false)
  })

  it('rejects an unknown level', async () => {
    await expect(resolveSiteConfig({
      deadLinks: { level: 'off' as never },
    })).rejects.toThrow('deadLinks.level must be "error" or "warn"')
  })

  it('rejects a non-array ignore list', async () => {
    await expect(resolveSiteConfig({
      deadLinks: { ignore: 'nope' as never },
    })).rejects.toThrow('deadLinks.ignore must be an array')
  })

  it('rejects an ignore entry that is not a string, RegExp, or function', async () => {
    await expect(resolveSiteConfig({
      deadLinks: { ignore: [1 as never] },
    })).rejects.toThrow('deadLinks.ignore[0] must be a string, regular expression, or function, got number')
  })
})
