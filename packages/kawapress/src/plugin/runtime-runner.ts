import type { App } from 'vue'
import type {
  RuntimePlugin,
  RuntimePluginAPI,
} from '../api/plugin'
import type { OutletRegistry } from '../core/outlet'
import type { Router } from '../core/router'
import {
  createPluginHandlerRegistry,
  runPluginSetup,
} from './execution'
import { createOutletCollector } from './outlet-collector'

export interface RuntimePluginRunner {
  outlets: OutletRegistry
  runVueApp: (app: App) => Promise<void>
  runRouter: (router: Router) => Promise<void>
}

export async function createRuntimePluginRunner(
  plugins: RuntimePlugin[],
): Promise<RuntimePluginRunner> {
  const vueAppHandlers = createPluginHandlerRegistry<App>('runtime', 'vueApp')
  const routerHandlers = createPluginHandlerRegistry<Router>('runtime', 'router')
  const outletCollector = createOutletCollector()

  for (const plugin of plugins) {
    const api: RuntimePluginAPI = {
      addToOutlet: outletCollector.addForPlugin(plugin.name),
      vueApp: handler => vueAppHandlers.add(plugin.name, handler),
      router: handler => routerHandlers.add(plugin.name, handler),
    }

    await runPluginSetup(
      'runtime',
      plugin.name,
      () => plugin.setup(api),
    )
  }

  return {
    outlets: outletCollector.createRegistry(),
    runVueApp: vueAppHandlers.run,
    runRouter: routerHandlers.run,
  }
}
