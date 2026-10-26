import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import runtimePlugin from './runtime-plugin'

describe('container runtime plugin', () => {
  it('is discoverable through the package exports', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { name: string, exports: Record<string, { import: string }> }

    expect(packageJson.name).toBe(runtimePlugin.name)
    expect(packageJson.exports['./runtime-plugin'].import)
      .toBe('./src/runtime-plugin.ts')
  })

  it('registers nothing beyond its stylesheet', async () => {
    const addToOutlet = vi.fn()
    const router = vi.fn()
    const vueApp = vi.fn()

    await runtimePlugin.setup({ addToOutlet, router, vueApp })

    expect(addToOutlet).not.toHaveBeenCalled()
    expect(router).not.toHaveBeenCalled()
    expect(vueApp).not.toHaveBeenCalled()
  })
})
