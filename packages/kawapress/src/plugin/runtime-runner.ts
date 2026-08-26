import type { App } from 'vue'
import type { Router } from 'vue-router'
import type {
  RuntimePlugin,
  RuntimePluginAPI,
} from '../api/plugin'
import {
  createPluginHandlerRegistry,
  runPluginSetup,
} from './execution'

export interface RuntimePluginRunner {
  runVueApp: (app: App) => Promise<void>
  runRouter: (router: Router) => Promise<void>
}

export async function createRuntimePluginRunner(
  plugins: RuntimePlugin[],
): Promise<RuntimePluginRunner> {
  const vueAppHandlers = createPluginHandlerRegistry<App>('runtime', 'vueApp')
  const routerHandlers = createPluginHandlerRegistry<Router>('runtime', 'router')

  for (const plugin of plugins) {
    const api: RuntimePluginAPI = {
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
    runVueApp: vueAppHandlers.run,
    runRouter: routerHandlers.run,
  }
}
