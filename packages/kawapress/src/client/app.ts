import type { Plugin } from 'vue'
import { runtimePlugins } from 'virtual:kawapress-runtime-plugins'
import { createSSRApp } from 'vue'
import { createRuntimePluginRunner } from '../plugin/runtime-runner'
import Root from './Root.vue'
import { createAppRouter } from './router'

export interface CreateKawapressAppOptions {
  head: Plugin
}

export async function createKawapressApp(
  { head }: CreateKawapressAppOptions,
) {
  const router = createAppRouter()
  const app = createSSRApp(Root)
  app.use(router)
  app.use(head)
  const pluginRunner = await createRuntimePluginRunner(runtimePlugins)
  await pluginRunner.runVueApp(app)
  await pluginRunner.runRouter(router)

  return {
    app,
    router,
  }
}
