import type { OutletItemInput, OutletName, RuntimePlugin } from 'kawapress'
import { describe, expect, it, vi } from 'vitest'
import Comments from './components/Comments.vue'
import runtimePlugin from './runtime-plugin'

// The component reads site and page data from the client entry; this test only
// checks where the plugin places it.
vi.mock('kawapress/client', () => ({}))
vi.mock('./runtime-options', () => ({
  default: { giscus: {}, labels: {}, localeLabels: {} },
}))

describe('comments runtime plugin', () => {
  it('places the comment section after the page content', async () => {
    const items = await collectOutletItems(runtimePlugin)

    expect(items).toHaveLength(1)
    expect(items[0].side).toBe('append')
    expect(items[0].outlet).toBe('doc')
    expect(items[0].item.id).toBe('comments')
    expect(items[0].item.component).toBe(Comments)
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
