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
