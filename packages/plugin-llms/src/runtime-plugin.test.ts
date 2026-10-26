import type { OutletItemInput, OutletName, RuntimePlugin } from 'kawapress'
import { describe, expect, it, vi } from 'vitest'
import LlmsActions from './components/LlmsActions.vue'
import runtimePlugin from './runtime-plugin'

// The components read page data from the client entry; the outlet test never renders them.
vi.mock('kawapress/client', () => ({}))

describe('llms runtime plugin', () => {
  it('places the page actions in the doc header outlet', async () => {
    const items = await collectOutletItems(runtimePlugin)

    expect(items).toHaveLength(1)
    expect(items[0].outlet).toBe('doc.header')
    expect(items[0].item.id).toBe('page-actions')
    expect(items[0].item.component).toBe(LlmsActions)
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
