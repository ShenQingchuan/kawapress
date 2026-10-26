import type { App, Plugin } from 'vue'
import type { Router } from 'vue-router'
import type { OutletRegistry } from '../core/outlet'
import type { PageManifest } from '../core/page-manifest'
import { runtimePlugins } from 'virtual:kawapress-runtime-plugins'
import { createSSRApp } from 'vue'
import { createRuntimePluginRunner } from '../plugin/runtime-runner'
import KawaOutlet from './components/KawaOutlet.vue'
import Root from './components/Root.vue'
import { createOutletRenderStore, outletRegistryKey, outletRenderStoreKey } from './outlet'
import { createAppRouter } from './router'

export interface CreateKawapressAppOptions {
  head: Plugin
  /**
   * Pages of the site. It is passed in rather than imported so the generated
   * manifest stays in its own chunk: a content edit then never invalidates the
   * chunk that holds the framework and the theme.
   */
  pageManifest: PageManifest
}

export interface KawapressApp {
  app: App
  router: Router
  outlets: OutletRegistry
  /** See {@link import('./router').AppRouter.adoptRequestedUrl}. */
  adoptRequestedUrl: () => Promise<void>
}

export async function createKawapressApp(
  { head, pageManifest }: CreateKawapressAppOptions,
): Promise<KawapressApp> {
  const { router, adoptRequestedUrl } = createAppRouter(pageManifest)
  const app = createSSRApp(Root)
  app.use(router)
  app.use(head)
  // Plugin setup runs before the app is touched, so the collected outlets are
  // provided before any `vueApp()` handler runs. Runtime plugins can then read
  // the registry through the app context, exactly like a theme component does.
  const pluginRunner = await createRuntimePluginRunner(runtimePlugins)
  app.provide(outletRegistryKey, pluginRunner.outlets)
  app.provide(outletRenderStoreKey, createOutletRenderStore())
  app.component('KawaOutlet', KawaOutlet)
  await pluginRunner.runVueApp(app)
  await pluginRunner.runRouter(router)

  return {
    app,
    router,
    outlets: pluginRunner.outlets,
    adoptRequestedUrl,
  }
}
