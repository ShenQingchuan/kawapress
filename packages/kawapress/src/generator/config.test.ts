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
