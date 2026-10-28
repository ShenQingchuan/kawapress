// @vitest-environment happy-dom

import type { App, Component } from 'vue'
import type { OutletItem, OutletName, OutletRegistry, OutletSlots } from '../../core/outlet'
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
  items: Partial<Record<OutletName, Partial<OutletSlots>>> = {},
): OutletRegistry {
  const registry = {} as Record<OutletName, OutletSlots>
  for (const name of OUTLET_NAMES) {
    registry[name] = { prepend: [], append: [], ...items[name] }
  }
  return registry
}

function registered(id: string, name: string): OutletItem {
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
  it('renders prepended items, the theme content, then appended items', async () => {
    const registry = createRegistry({
      'layout.header.end': {
        prepend: [
          registered('search', '@acme/plugin-search'),
          registered('banner', '@acme/plugin-banner'),
        ],
        append: [registered('llms', '@acme/plugin-llms')],
      },
    })

    mount(defineComponent({
      setup: () => () => h(
        KawaOutlet,
        { name: 'layout.header.end' },
        { default: () => h('b', 'theme') },
      ),
    }), registry)
    await nextTick()

    expect(document.querySelector('#app')!.innerHTML).toBe(
      '<span class="item-search">search</span><span class="item-banner">banner</span>'
      + '<b>theme</b><span class="item-llms">llms</span>',
    )
  })

  it('renders only the theme content when no plugin contributed', async () => {
    mount(defineComponent({
      setup: () => () => h('div', { class: 'page' }, [
        'before',
        h(KawaOutlet, { name: 'doc' }, { default: () => 'theme' }),
        'after',
      ]),
    }))
    await nextTick()

    expect(document.querySelector('#app')!.innerHTML)
      .toBe('<div class="page">beforethemeafter</div>')
  })

  it('renders nothing and no wrapper element for an empty outlet without theme content', async () => {
    mount(defineComponent({
      setup: () => () => h('div', { class: 'page' }, [
        'before',
        h(KawaOutlet, { name: 'doc' }),
        'after',
      ]),
    }))
    await nextTick()

    expect(document.querySelector('#app')!.innerHTML)
      .toBe('<div class="page">beforeafter</div>')
  })

  it('reports an unknown outlet name', async () => {
    const errors: unknown[] = []
    mount(defineComponent({
      setup: () => () => h(KawaOutlet, { name: 'doc.before' as OutletName }),
    }), createRegistry(), errors)
    await nextTick()

    expect(errors).toHaveLength(1)
    expect(String(errors[0])).toContain(
      'KawaPress: <KawaOutlet> uses the unknown outlet "doc.before". Available outlets: layout.header, layout.header.start, layout.header.end, layout.sidebar, layout.footer, doc, doc.under-title, doc.toc.',
    )
  })

  it('warns once per app when the same outlet is mounted twice', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registry = createRegistry({
      doc: { append: [registered('comments', '@acme/plugin-comments')] },
    })

    mount(defineComponent({
      setup: () => () => h('div', [
        h(KawaOutlet, { name: 'doc' }),
        h(KawaOutlet, { name: 'doc' }),
        h(KawaOutlet, { name: 'doc' }),
      ]),
    }), registry)
    await nextTick()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('"doc"')
    expect(document.querySelectorAll('.item-comments')).toHaveLength(3)

    app?.unmount()
    app = undefined
    document.body.innerHTML = '<div id="app"></div>'
    mount(defineComponent({
      setup: () => () => h('div', [
        h(KawaOutlet, { name: 'doc' }),
        h(KawaOutlet, { name: 'doc' }),
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
        h(KawaOutlet, { name: 'doc' }),
        h(KawaOutlet, { name: 'doc.toc' }),
      ]),
    }), registry)
    await nextTick()

    expect(getOutletItems(registry, 'doc')).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('outlet hydration', () => {
  const page = defineComponent({
    setup: () => () => h('div', [
      h('h1', 'Title'),
      h(KawaOutlet, { name: 'doc.under-title' }),
      h('p', 'body'),
    ]),
  })

  it('renders identical markup on the server and in the browser', async () => {
    for (const items of [
      createRegistry(),
      createRegistry({
        'doc.under-title': { append: [registered('actions', '@acme/plugin-llms')] },
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
