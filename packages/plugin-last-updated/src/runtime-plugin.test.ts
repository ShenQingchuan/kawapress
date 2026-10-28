import type { OutletItemInput, OutletName, RuntimePlugin } from 'kawapress'
import { describe, expect, it, vi } from 'vitest'
import LastUpdated from './components/LastUpdated.vue'
import runtimePlugin from './runtime-plugin'

// The component reads page data and plugin options from virtual modules; the
// outlet test never renders it.
vi.mock('kawapress/client', () => ({}))
vi.mock('./runtime-options', () => ({ runtimeOptions: {} }))

describe('last updated runtime plugin', () => {
  it('places the last updated line after the page content', async () => {
    const items = await collectOutletItems(runtimePlugin)

    expect(items).toHaveLength(1)
    expect(items[0].side).toBe('append')
    expect(items[0].outlet).toBe('doc')
    expect(items[0].item.id).toBe('last-updated')
    expect(items[0].item.component).toBe(LastUpdated)
  })
})

async function collectOutletItems(
  plugin: RuntimePlugin,
): Promise<{ side: 'prepend' | 'append', outlet: OutletName, item: OutletItemInput }[]> {
  const items: { side: 'prepend' | 'append', outlet: OutletName, item: OutletItemInput }[] = []
  await plugin.setup({
    prependToOutlet: (outlet, item) => {
      items.push({ side: 'prepend', outlet, item })
    },
    appendToOutlet: (outlet, item) => {
      items.push({ side: 'append', outlet, item })
    },
    router: () => {},
    vueApp: () => {},
  })
  return items
}
