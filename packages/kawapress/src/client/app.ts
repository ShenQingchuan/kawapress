import type { Plugin } from 'vue'
import { useHead } from '@unhead/vue'
import { runtimePlugins } from 'virtual:kawapress-runtime-plugins'
import { createSSRApp, defineComponent, h, resolveComponent } from 'vue'
import { useSite } from './composables'
import { createAppRouter } from './router'
import { createRuntimePluginRunner } from './runtime-plugin-runner'

export const Root = defineComponent({
  setup() {
    const site = useSite()
    useHead(() => ({
      htmlAttrs: {
        lang: site.value.lang,
        dir: site.value.dir,
      },
    }))

    const Layout = resolveComponent('Layout')
    return () => h(Layout)
  },
})

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
