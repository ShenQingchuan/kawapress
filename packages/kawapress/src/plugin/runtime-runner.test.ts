import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineRuntimePlugin } from '../api/plugin'
import { createRuntimePluginRunner } from './runtime-runner'

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
            router.addRoute({
              name: 'plugin-route',
              path: '/plugin',
              component: {},
            })
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
            calls.push(`router:second:${String(router.hasRoute('plugin-route'))}`)
          })
        },
      }),
    ])
    const app = createSSRApp({})
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
    })

    await runner.runVueApp(app)
    await runner.runRouter(router)

    expect(calls).toEqual([
      'setup:first',
      'setup:second',
      'vueApp:first',
      'vueApp:second:true',
      'router:first',
      'router:second:true',
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

  it('collects items in plugin order, then call order, with full ids', async () => {
    const runner = await createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-first',
        setup(api) {
          api.addToOutlet('header.actions', { id: 'trigger', component: First })
          api.addToOutlet('doc.after', { id: 'comments', component: Second })
        },
      }),
      defineRuntimePlugin({
        name: '@acme/plugin-second',
        setup(api) {
          api.addToOutlet('header.actions', { id: 'trigger', component: Second })
        },
      }),
    ])

    expect(runner.outlets['header.actions'].map(item => item.id)).toEqual([
      '@acme/plugin-first:trigger',
      '@acme/plugin-second:trigger',
    ])
    expect(runner.outlets['doc.after']).toEqual([
      {
        id: '@acme/plugin-first:comments',
        owner: '@acme/plugin-first',
        component: Second,
      },
    ])
    expect(runner.outlets['doc.footer']).toEqual([])
  })

  it('rejects unknown outlet names with the plugin identity', async () => {
    const runner = createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-broken',
        setup(api) {
          api.addToOutlet('header.action' as 'header.actions', {
            id: 'trigger',
            component: First,
          })
        },
      }),
    ])

    await expect(runner).rejects.toThrow(
      'KawaPress: plugin "@acme/plugin-broken" calling api.addToOutlet() uses the unknown outlet "header.action".',
    )
  })

  it('rejects empty item ids', async () => {
    const runner = createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-broken',
        setup(api) {
          api.addToOutlet('doc.footer', { id: '  ', component: First })
        },
      }),
    ])

    await expect(runner).rejects.toThrow(
      '[@acme/plugin-broken / runtime / addToOutlet] Item id for outlet "doc.footer" must be a non-empty string.',
    )
  })

  it('rejects duplicate ids inside one plugin', async () => {
    const runner = createRuntimePluginRunner([
      defineRuntimePlugin({
        name: '@acme/plugin-broken',
        setup(api) {
          api.addToOutlet('doc.footer', { id: 'updated-at', component: First })
          api.addToOutlet('doc.footer', { id: 'updated-at', component: Second })
        },
      }),
    ])

    await expect(runner).rejects.toThrow(
      '[@acme/plugin-broken / runtime / addToOutlet] Duplicate item id "@acme/plugin-broken:updated-at"',
    )
  })
})
