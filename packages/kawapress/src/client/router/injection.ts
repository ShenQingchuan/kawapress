import type { InjectionKey, ShallowRef } from 'vue'
import type { Route, Router } from '../../core/router'
import type { AppRouterInstance } from './router'
import { inject } from 'vue'

/** Injection key of the router a KawaPress app provides. */
export const routerKey: InjectionKey<AppRouterInstance> = Symbol('kawapress:router')

/** Router of the current app: navigation, guards and the current route. */
export function useRouter(): Router {
  return useAppRouter()
}

/** Current route of the app, updated by every navigation. */
export function useRoute(): Readonly<ShallowRef<Route>> {
  return useAppRouter().currentRoute
}

/** Internal access shared by `RouterView` and `RouterLink`. */
export function useAppRouter(): AppRouterInstance {
  const router = inject(routerKey, undefined)
  if (!router) {
    throw new Error(
      'KawaPress: useRoute() and useRouter() need a KawaPress app. '
      + 'Render the component from a theme layout, or create the app with createKawapressApp().',
    )
  }
  return router
}
