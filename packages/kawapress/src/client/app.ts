import type { App, Plugin } from 'vue'
import type { OutletRegistry } from '../core/outlet'
import type { PageTable } from '../core/page-manifest'
import type { Router } from '../core/router'
import { runtimePlugins } from 'virtual:kawapress-runtime-plugins'
import { createSSRApp } from 'vue'
import { createRuntimePluginRunner } from '../plugin/runtime-runner'
import KawaOutlet from './components/KawaOutlet.vue'
import Root from './components/Root.vue'
import { createOutletRenderStore, outletRegistryKey, outletRenderStoreKey } from './outlet'
import { createAppRouter } from './router/app-router'
import { routerKey } from './router/injection'

export interface CreateKawapressAppOptions {
  head: Plugin
  /**
   * Pages of the site. A dev server and the SSR build hand over module loaders;
   * the browser of a build hands over the chunk files its page table names.
   */
  pages: PageTable
}

export interface KawapressApp {
  app: App
  router: Router
  outlets: OutletRegistry
  /** See {@link import('./router/app-router').AppRouter.start}. */
  start: () => Promise<void>
  /** See {@link import('./router/app-router').AppRouter.adoptRequestedUrl}. */
  adoptRequestedUrl: () => Promise<void>
}

export async function createKawapressApp(
  { head, pages }: CreateKawapressAppOptions,
): Promise<KawapressApp> {
  const { router, start, adoptRequestedUrl } = createAppRouter(pages)
  const app = createSSRApp(Root)
  app.provide(routerKey, router)
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
    start,
    adoptRequestedUrl,
  }
}
