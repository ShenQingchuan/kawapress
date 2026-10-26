import type { OutletItemInput, OutletName, RuntimePlugin } from 'kawapress'
import { describe, expect, it, vi } from 'vitest'
import Search from './components/Search.vue'
import runtimePlugin from './runtime-plugin'

// The components read page data from the client entry; the outlet test never renders them.
vi.mock('kawapress/client', () => ({}))
vi.mock('virtual:kawapress-search-index', () => ({ searchIndexLoaders: {} }))

describe('search runtime plugin', () => {
  it('places the search trigger in the header actions outlet', async () => {
    const items = await collectOutletItems(runtimePlugin)

    expect(items).toHaveLength(1)
    expect(items[0].outlet).toBe('header.actions')
    expect(items[0].item.id).toBe('trigger')
    expect(items[0].item.component).toBe(Search)
  })
})

async function collectOutletItems(
  plugin: RuntimePlugin,
): Promise<{ outlet: OutletName, item: OutletItemInput }[]> {
  const items: { outlet: OutletName, item: OutletItemInput }[] = []
  await plugin.setup({
    addToOutlet: (outlet, item) => {
      items.push({ outlet, item })
    },
    router: () => {},
    vueApp: () => {},
  })
  return items
}
