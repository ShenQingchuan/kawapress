// @vitest-environment happy-dom

import type { App, Component } from 'vue'
import type { OutletItem, OutletName, OutletRegistry } from '../../core/outlet'
import { renderToString } from '@vue/server-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, createSSRApp, defineComponent, h, nextTick } from 'vue'
import { getOutletItems, OUTLET_NAMES } from '../../core/outlet'
import { createOutletRenderStore, outletRegistryKey, outletRenderStoreKey } from '../outlet'
import KawaOutlet from './KawaOutlet.vue'

function item(name: string): Component {
  return defineComponent({
    name: `Item${name}`,
    setup: () => () => h('span', { class: `item-${name}` }, name),
  })
}

function createRegistry(
  items: Partial<Record<OutletName, OutletItem[]>> = {},
): OutletRegistry {
  const registry = {} as Record<OutletName, readonly OutletItem[]>
  for (const name of OUTLET_NAMES) {
    registry[name] = items[name] ?? []
  }
  return registry
}

function registered(outlet: OutletName, id: string, name: string): OutletItem {
  return { id: `${name}:${id}`, owner: name, component: item(id) }
}

let app: App<Element> | undefined

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  // `import.meta.env.DEV` is false under vitest's `test` mode.
  vi.stubEnv('DEV', true)
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function mount(
  root: Component,
  registry: OutletRegistry = createRegistry(),
  errors: unknown[] = [],
): void {
  app = createApp(root)
  app.config.errorHandler = error => errors.push(error)
  app.provide(outletRegistryKey, registry)
  app.provide(outletRenderStoreKey, createOutletRenderStore())
  app.mount('#app')
}

describe('outlet rendering', () => {
  it('renders every item of one outlet in registry order', async () => {
    const registry = createRegistry({
      'header.actions': [
        registered('header.actions', 'search', '@acme/plugin-search'),
        registered('header.actions', 'llms', '@acme/plugin-llms'),
      ],
    })

    mount(defineComponent({
      setup: () => () => h(KawaOutlet, { name: 'header.actions' }),
    }), registry)
    await nextTick()

    expect(document.querySelector('#app')!.innerHTML)
      .toBe('<span class="item-search">search</span><span class="item-llms">llms</span>')
  })

  it('renders nothing and no wrapper element for an empty outlet', async () => {
    mount(defineComponent({
      setup: () => () => h('div', { class: 'page' }, [
        'before',
        h(KawaOutlet, { name: 'doc.after' }),
        'after',
      ]),
    }))
    await nextTick()

    expect(document.querySelector('#app')!.innerHTML)
      .toBe('<div class="page">beforeafter</div>')
  })

  it('hands the items to the scoped slot for filtering and wrapping', async () => {
    const registry = createRegistry({
      'doc.footer': [
        registered('doc.footer', 'updated-at', '@acme/plugin-updated-at'),
        registered('doc.footer', 'edit-link', '@acme/plugin-edit-link'),
      ],
    })

    mount(defineComponent({
      setup: () => () => h(
        KawaOutlet,
        { name: 'doc.footer' },
        {
          default: ({ items }: { items: readonly OutletItem[] }) => h(
            'nav',
            { class: 'footer' },
            items
              .filter(entry => entry.id !== '@acme/plugin-edit-link:edit-link')
              .map(entry => h('span', { key: entry.id }, entry.id)),
          ),
        },
      ),
    }), registry)
    await nextTick()

    expect(document.querySelector('#app')!.innerHTML)
      .toBe('<nav class="footer"><span>@acme/plugin-updated-at:updated-at</span></nav>')
  })

  it('reports an unknown outlet name', async () => {
    const errors: unknown[] = []
    mount(defineComponent({
      setup: () => () => h(KawaOutlet, { name: 'doc.before' as OutletName }),
    }), createRegistry(), errors)
    await nextTick()

    expect(errors).toHaveLength(1)
    expect(String(errors[0])).toContain(
      'KawaPress: <KawaOutlet> uses the unknown outlet "doc.before". Available outlets: header.actions, doc.header, doc.footer, doc.after.',
    )
  })

  it('warns once per app when the same outlet is mounted twice', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registry = createRegistry({
      'doc.after': [registered('doc.after', 'comments', '@acme/plugin-comments')],
    })

    mount(defineComponent({
      setup: () => () => h('div', [
        h(KawaOutlet, { name: 'doc.after' }),
        h(KawaOutlet, { name: 'doc.after' }),
        h(KawaOutlet, { name: 'doc.after' }),
      ]),
    }), registry)
    await nextTick()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('"doc.after"')
    expect(document.querySelectorAll('.item-comments')).toHaveLength(3)

    app?.unmount()
    app = undefined
    document.body.innerHTML = '<div id="app"></div>'
    mount(defineComponent({
      setup: () => () => h('div', [
        h(KawaOutlet, { name: 'doc.after' }),
        h(KawaOutlet, { name: 'doc.after' }),
      ]),
    }), registry)
    await nextTick()

    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('does not warn when outlets are mounted one after another', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registry = createRegistry()

    mount(defineComponent({
      setup: () => () => h('div', [
        h(KawaOutlet, { name: 'doc.after' }),
        h(KawaOutlet, { name: 'doc.footer' }),
      ]),
    }), registry)
    await nextTick()

    expect(getOutletItems(registry, 'doc.after')).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('outlet hydration', () => {
  const page = defineComponent({
    setup: () => () => h('div', [
      h('h1', 'Title'),
      h(KawaOutlet, { name: 'doc.header' }),
      h('p', 'body'),
    ]),
  })

  it('renders identical markup on the server and in the browser', async () => {
    for (const items of [
      createRegistry(),
      createRegistry({
        'doc.header': [registered('doc.header', 'actions', '@acme/plugin-llms')],
      }),
    ]) {
      const serverApp = createSSRApp(page)
      serverApp.provide(outletRegistryKey, items)
      const html = await renderToString(serverApp)

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      document.body.innerHTML = `<div id="app">${html}</div>`
      app = createSSRApp(page)
      app.provide(outletRegistryKey, items)
      app.provide(outletRenderStoreKey, createOutletRenderStore())
      app.mount('#app')
      await nextTick()

      expect(warn).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      expect(document.querySelector('#app')!.innerHTML.replace(/<!--.*?-->/g, ''))
        .toBe(html.replace(/<!--.*?-->/g, ''))

      app.unmount()
      app = undefined
      vi.restoreAllMocks()
    }
  })
})
