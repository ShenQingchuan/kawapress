import type { OutletItemInput, OutletName, RuntimePlugin } from 'kawapress'
import { describe, expect, it, vi } from 'vitest'
import LlmsActions from './components/LlmsActions.vue'
import runtimePlugin from './runtime-plugin'

// The components read page data from the client entry; the outlet test never renders them.
vi.mock('kawapress/client', () => ({}))

describe('llms runtime plugin', () => {
  it('places the page actions below the page title', async () => {
    const items = await collectOutletItems(runtimePlugin)

    expect(items).toHaveLength(1)
    expect(items[0].side).toBe('append')
    expect(items[0].outlet).toBe('doc.under-title')
    expect(items[0].item.id).toBe('page-actions')
    expect(items[0].item.component).toBe(LlmsActions)
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
