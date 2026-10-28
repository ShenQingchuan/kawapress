import type { Route, Router } from '../core/router'
import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { defineRuntimePlugin } from '../api/plugin'
import { createRuntimePluginRunner } from './runtime-runner'

/** Router stub: the runner only hands it to the handlers. */
function createFakeRouter(): Router {
  const route: Route = {
    path: '/',
    fullPath: '/',
    query: {},
    hash: '',
    found: true,
  }
  return {
    currentRoute: { value: route } as Router['currentRoute'],
    push: async () => {},
    replace: async () => {},
    beforeEach: () => () => {},
    afterEach: () => () => {},
  }
}

describe('createRuntimePluginRunner', () => {
  it('runs setup and handlers serially against the same Vue app and router', async () => {
    const calls: string[] = []
    const runner = await createRuntimePluginRunner([
      defineRuntimePlugin({
        name: 'first',
        async setup(api) {
          await Promise.resolve()
          calls.push('setup:first')
          api.vueApp(async (app) => {
            await Promise.resolve()
            calls.push('vueApp:first')
            app.config.globalProperties.first = true
          })
          api.router((router) => {
            calls.push('router:first')
            router.beforeEach(() => false)
          })
        },
      }),
      defineRuntimePlugin({
        name: 'second',
        setup(api) {
          calls.push('setup:second')
          api.vueApp((app) => {
            calls.push(`vueApp:second:${String(app.config.globalProperties.first)}`)
          })
          api.router((router) => {
            calls.push(`router:second:${router.currentRoute.value.path}`)
          })
        },
      }),
    ])
    const app = createSSRApp({})
    const router = createFakeRouter()

    await runner.runVueApp(app)
    await runner.runRouter(router)

    expect(calls).toEqual([
      'setup:first',
      'setup:second',
      'vueApp:first',
      'vueApp:second:true',
      'router:first',
      'router:second:/',
    ])
  })

  it('reports the plugin and capability when a handler fails', async () => {
    const cause = new Error('broken app')
    const runner = await createRuntimePluginRunner([
      defineRuntimePlugin({
        name: 'broken-plugin',
        setup(api) {
          api.vueApp(() => {
            throw cause
          })
        },
      }),
    ])

    const run = runner.runVueApp(createSSRApp({}))

    await expect(run).rejects.toThrow(
      '[broken-plugin / runtime / vueApp] Plugin execution failed.',
    )
    await expect(run).rejects.toHaveProperty('cause', cause)
  })
})

describe('runtime plugin outlets', () => {
  const First = { name: 'FirstItem' }
  const Second = { name: 'SecondItem' }

  it('collects each side in plugin order, then call order, with full ids', async () => {
    const runner = await createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-first',
        setup(api) {
          api.prependToOutlet('layout.header.end', { id: 'trigger', component: First })
          api.appendToOutlet('doc', { id: 'comments', component: Second })
        },
      }),
      defineRuntimePlugin({
        name: '@acme/plugin-second',
        setup(api) {
          api.prependToOutlet('layout.header.end', { id: 'trigger', component: Second })
          api.appendToOutlet('doc', { id: 'updated-at', component: First })
        },
      }),
    ])

    expect(runner.outlets['layout.header.end'].prepend.map(item => item.id)).toEqual([
      '@acme/plugin-first:trigger',
      '@acme/plugin-second:trigger',
    ])
    expect(runner.outlets.doc.append).toEqual([
      { id: '@acme/plugin-first:comments', owner: '@acme/plugin-first', component: Second },
      { id: '@acme/plugin-second:updated-at', owner: '@acme/plugin-second', component: First },
    ])
    expect(runner.outlets.doc.prepend).toEqual([])
    expect(runner.outlets['layout.sidebar']).toEqual({ prepend: [], append: [] })
  })

  it('rejects unknown outlet names with the plugin identity', async () => {
    const runner = createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-broken',
        setup(api) {
          api.appendToOutlet('header.action' as 'doc', {
            id: 'trigger',
            component: First,
          })
        },
      }),
    ])

    await expect(runner).rejects.toThrow(
      'KawaPress: plugin "@acme/plugin-broken" calling api.appendToOutlet() uses the unknown outlet "header.action".',
    )
  })

  it('rejects empty item ids', async () => {
    const runner = createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-broken',
        setup(api) {
          api.prependToOutlet('doc', { id: '  ', component: First })
        },
      }),
    ])

    await expect(runner).rejects.toThrow(
      '[@acme/plugin-broken / runtime / prependToOutlet] Item id for outlet "doc" must be a non-empty string.',
    )
  })

  it('rejects duplicate ids inside one plugin, even across the two sides', async () => {
    const runner = createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-broken',
        setup(api) {
          api.prependToOutlet('doc', { id: 'updated-at', component: First })
          api.appendToOutlet('doc', { id: 'updated-at', component: Second })
        },
      }),
    ])

    await expect(runner).rejects.toThrow(
      '[@acme/plugin-broken / runtime / appendToOutlet] Duplicate item id "@acme/plugin-broken:updated-at"',
    )
  })
})
