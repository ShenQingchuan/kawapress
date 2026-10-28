import type { OutletItemInput, OutletName, RuntimePlugin } from 'kawapress'
import { describe, expect, it, vi } from 'vitest'
import Search from './components/Search.vue'
import runtimePlugin from './runtime-plugin'

// The components read page data from the client entry; the outlet test never renders them.
vi.mock('kawapress/client', () => ({}))
vi.mock('virtual:kawapress-search-index', () => ({ searchIndexLoaders: {} }))

describe('search runtime plugin', () => {
  it('places the search trigger before the header controls', async () => {
    const items = await collectOutletItems(runtimePlugin)

    expect(items).toHaveLength(1)
    expect(items[0].side).toBe('prepend')
    expect(items[0].outlet).toBe('layout.header.end')
    expect(items[0].item.id).toBe('trigger')
    expect(items[0].item.component).toBe(Search)
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
